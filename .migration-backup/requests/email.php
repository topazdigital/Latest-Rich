<?php
// requests/email.php - FIXED with base64 decoding to avoid mod_security
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');

header('Content-Type: application/json');

$corePath = __DIR__ . '/../assets/includes/core.php';
if (!file_exists($corePath)) {
    echo json_encode(['success' => false, 'message' => 'Core include not found']);
    exit;
}
require_once($corePath);

// Ensure required tables exist
$mysqli->query("CREATE TABLE IF NOT EXISTS email_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    all_real TINYINT DEFAULT 0,
    recipients TEXT,
    batch_size INT DEFAULT 100,
    cooling_minutes INT DEFAULT 10,
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    created_by INT,
    created_at INT,
    updated_at INT,
    scheduled_start INT DEFAULT 0,
    next_run INT DEFAULT 0,
    total_recipients INT DEFAULT 0,
    sent_recipients INT DEFAULT 0,
    status ENUM('draft','running','stopped','finished') DEFAULT 'draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$mysqli->query("CREATE TABLE IF NOT EXISTS email_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    user_id INT DEFAULT 0,
    email VARCHAR(255) NOT NULL,
    queued_at INT NOT NULL,
    sent TINYINT DEFAULT 0,
    sent_at INT DEFAULT 0,
    INDEX(campaign_id, sent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if (file_exists(__DIR__ . '/../assets/includes/logger.php')) {
    require_once __DIR__ . '/../assets/includes/logger.php';
} else {
    function write_email_log($msg, $type = 'INFO') {
        $logfile = __DIR__ . '/../../logs/email_campaign.log';
        $line = date('Y-m-d H:i:s') . " [{$type}] " . $msg . PHP_EOL;
        @file_put_contents($logfile, $line, FILE_APPEND | LOCK_EX);
    }
}

if (empty($sm['user']['id']) || intval($sm['user']['admin']) !== 1) {
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit;
}

function respond($arr) {
    header('Content-Type: application/json');
    echo json_encode($arr);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log('JSON encode error: ' . json_last_error_msg());
        echo '{"success":false,"message":"Internal encoding error"}';
    }
    exit;
}

// Helper to decode base64 safely (subject and message are sent encoded)
function decode_b64($str) {
    if (empty($str)) return '';
    $decoded = base64_decode($str, true);
    if ($decoded === false) {
        // Not valid base64? Return as is (maybe it's plain text)
        return $str;
    }
    return $decoded;
}

$action = $_REQUEST['action'] ?? '';

switch ($action) {

    case 'count_real_users':
        $res = $mysqli->query("SELECT COUNT(*) FROM users WHERE fake = 0 AND email IS NOT NULL AND email != ''");
        $count = $res ? $res->fetch_row()[0] : 0;
        respond(['success' => true, 'count' => $count]);
        break;

    case 'search_users':
        $q = $mysqli->real_escape_string($_REQUEST['q'] ?? '');
        if (strlen($q) < 2) respond(['success' => true, 'users' => []]);
        $like = '%' . $q . '%';
        $sql = "SELECT id, email, COALESCE(name, username, email) AS display_name FROM users 
                WHERE fake = 0 AND (email LIKE '{$like}' OR username LIKE '{$like}' OR name LIKE '{$like}' OR id LIKE '{$like}') LIMIT 15";
        $res = $mysqli->query($sql);
        $users = [];
        while ($r = $res->fetch_assoc()) $users[] = $r;
        respond(['success' => true, 'users' => $users]);
        break;

    case 'save_campaign':
        $campaign_id = intval($_POST['campaign_id'] ?? 0);
        $subject_raw = $_POST['subject'] ?? '';
        $message_raw = $_POST['message'] ?? '';
        $subject = $mysqli->real_escape_string(decode_b64($subject_raw));
        $message = $mysqli->real_escape_string(decode_b64($message_raw));
        $all_real = (isset($_POST['all_real']) && $_POST['all_real'] == '1') ? 1 : 0;
        $recipients_raw = trim($_POST['recipients'] ?? '');
        $recipients = $mysqli->real_escape_string($recipients_raw);
        $batch_size = max(1, intval($_POST['batch_size'] ?? 100));
        $cooling_minutes = max(1, intval($_POST['cooling_minutes'] ?? 10));
        $from_name = $mysqli->real_escape_string($_POST['from_name'] ?? ($sm['config']['name'] ?? ''));
        $from_email = $mysqli->real_escape_string($_POST['from_email'] ?? ($sm['config']['contact_email'] ?? ''));
        $scheduled_start = !empty($_POST['scheduled_start']) ? strtotime($_POST['scheduled_start']) : 0;

        if ($campaign_id > 0) {
            $sql = "UPDATE email_campaigns SET 
                subject='{$subject}', message='{$message}', all_real={$all_real}, recipients='{$recipients}',
                batch_size={$batch_size}, cooling_minutes={$cooling_minutes}, from_name='{$from_name}',
                from_email='{$from_email}', scheduled_start={$scheduled_start}, updated_at=" . time() . "
                WHERE id={$campaign_id}";
            if (!$mysqli->query($sql)) {
                write_email_log("DB error in save_campaign (update): " . $mysqli->error, 'ERROR');
                respond(['success' => false, 'message' => 'Database error: ' . $mysqli->error]);
            }
            $mysqli->query("DELETE FROM email_queue WHERE campaign_id = {$campaign_id}");
        } else {
            $sql = "INSERT INTO email_campaigns 
                (subject,message,all_real,recipients,batch_size,cooling_minutes,from_name,from_email,created_by,created_at,scheduled_start,status) 
                VALUES ('{$subject}','{$message}',{$all_real},'{$recipients}',{$batch_size},{$cooling_minutes},
                '{$from_name}','{$from_email}','{$sm['user']['id']}'," . time() . ",{$scheduled_start},'draft')";
            if (!$mysqli->query($sql)) {
                write_email_log("DB error in save_campaign (insert): " . $mysqli->error, 'ERROR');
                respond(['success' => false, 'message' => 'Database error: ' . $mysqli->error]);
            }
            $campaign_id = $mysqli->insert_id;
        }
        respond(['success' => true, 'campaign_id' => $campaign_id]);
        break;

    case 'start_campaign':
        $campaign_id = intval($_POST['campaign_id'] ?? 0);
        $subject_raw = $_POST['subject'] ?? '';
        $message_raw = $_POST['message'] ?? '';
        $subject = $mysqli->real_escape_string(decode_b64($subject_raw));
        $message = $mysqli->real_escape_string(decode_b64($message_raw));
        $all_real = (isset($_POST['all_real']) && $_POST['all_real'] == '1') ? 1 : 0;
        $recipients_raw = trim($_POST['recipients'] ?? '');
        $batch_size = max(1, intval($_POST['batch_size'] ?? 100));
        $cooling_minutes = max(1, intval($_POST['cooling_minutes'] ?? 10));
        $from_name = $mysqli->real_escape_string($_POST['from_name'] ?? ($sm['config']['name'] ?? ''));
        $from_email = $mysqli->real_escape_string($_POST['from_email'] ?? ($sm['config']['contact_email'] ?? ''));
        $scheduled_start = !empty($_POST['scheduled_start']) ? strtotime($_POST['scheduled_start']) : 0;

        $mysqli->query("DELETE FROM email_queue WHERE campaign_id = {$campaign_id}");
        $mysqli->query("UPDATE email_campaigns SET total_recipients = 0, sent_recipients = 0, status = 'running' WHERE id = {$campaign_id}");

        if ($campaign_id > 0) {
            $mysqli->query("UPDATE email_campaigns SET 
                subject='{$subject}', message='{$message}', all_real={$all_real}, recipients='" . $mysqli->real_escape_string($recipients_raw) . "',
                batch_size={$batch_size}, cooling_minutes={$cooling_minutes}, from_name='{$from_name}',
                from_email='{$from_email}', scheduled_start={$scheduled_start}, updated_at=" . time() . "
                WHERE id={$campaign_id}");
        } else {
            $mysqli->query("INSERT INTO email_campaigns 
                (subject,message,all_real,recipients,batch_size,cooling_minutes,from_name,from_email,created_by,created_at,scheduled_start,status) 
                VALUES ('{$subject}','{$message}',{$all_real},'" . $mysqli->real_escape_string($recipients_raw) . "',{$batch_size},{$cooling_minutes},
                '{$from_name}','{$from_email}','{$sm['user']['id']}'," . time() . ",{$scheduled_start},'running')");
            $campaign_id = $mysqli->insert_id;
        }

        $queued = 0;
        $recipients_trim = trim($recipients_raw);

        if ($recipients_trim !== '') {
            $lines = preg_split("/[\r\n,]+/", $recipients_trim);
            foreach ($lines as $r) {
                $r = trim($r);
                if ($r === '') continue;

                if (preg_match('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', $r, $m)) {
                    $emailAddr = $m[0];
                    if (filter_var($emailAddr, FILTER_VALIDATE_EMAIL)) {
                        $emailEsc = $mysqli->real_escape_string($emailAddr);
                        $mysqli->query("INSERT INTO email_queue (campaign_id,user_id,email,queued_at) VALUES ({$campaign_id},0,'{$emailEsc}'," . time() . ")");
                        $queued++;
                        continue;
                    }
                }

                $justDigits = preg_replace('/\D/', '', $r);
                if ($justDigits !== '' && ctype_digit($justDigits)) {
                    $uid = intval($justDigits);
                    $uqr = $mysqli->query("SELECT email FROM users WHERE id = {$uid} AND fake = 0 AND email IS NOT NULL AND email != '' LIMIT 1");
                    if ($uqr && $uqr->num_rows) {
                        $ue = $uqr->fetch_assoc();
                        $emailEsc = $mysqli->real_escape_string($ue['email']);
                        $mysqli->query("INSERT INTO email_queue (campaign_id,user_id,email,queued_at) VALUES ({$campaign_id},{$uid},'{$emailEsc}'," . time() . ")");
                        $queued++;
                        continue;
                    }
                }

                if (filter_var($r, FILTER_VALIDATE_EMAIL)) {
                    $emailEsc = $mysqli->real_escape_string($r);
                    $mysqli->query("INSERT INTO email_queue (campaign_id,user_id,email,queued_at) VALUES ({$campaign_id},0,'{$emailEsc}'," . time() . ")");
                    $queued++;
                    continue;
                }
            }

            if ($queued === 0) {
                $mysqli->query("UPDATE email_campaigns SET status='stopped' WHERE id={$campaign_id}");
                respond(['success' => false, 'message' => 'No valid recipients found in custom list. Campaign stopped.']);
            }
        } elseif ($all_real === 1) {
            $q = $mysqli->query("SELECT id,email FROM users WHERE fake = 0 AND email IS NOT NULL AND email != ''");
            while ($u = $q->fetch_assoc()) {
                $emailEsc = $mysqli->real_escape_string($u['email']);
                $mysqli->query("INSERT INTO email_queue (campaign_id,user_id,email,queued_at) VALUES ({$campaign_id},{$u['id']},'{$emailEsc}'," . time() . ")");
                $queued++;
            }
        } else {
            $mysqli->query("UPDATE email_campaigns SET status='stopped' WHERE id={$campaign_id}");
            respond(['success' => false, 'message' => 'No recipients provided and "Send to all" not selected. Campaign stopped.']);
        }

        $next_run = $scheduled_start > 0 ? $scheduled_start : time();
        $mysqli->query("UPDATE email_campaigns SET 
            total_recipients = {$queued},
            sent_recipients = 0,
            next_run = {$next_run},
            updated_at = " . time() . "
            WHERE id = {$campaign_id}");

        respond(['success' => true, 'queued' => $queued, 'campaign_id' => $campaign_id]);
        break;

    case 'list_campaigns':
        $res = $mysqli->query("SELECT id,subject,status,total_recipients,sent_recipients,next_run FROM email_campaigns ORDER BY created_at DESC LIMIT 200");
        $campaigns = [];
        while ($r = $res->fetch_assoc()) {
            $r['next_run_human'] = !empty($r['next_run']) ? date('Y-m-d H:i:s', $r['next_run']) : '';
            $campaigns[] = $r;
        }
        respond(['success' => true, 'campaigns' => $campaigns]);
        break;

    case 'get_campaign':
        $cid = intval($_REQUEST['campaign_id'] ?? 0);
        if (!$cid) respond(['success' => false, 'message' => 'Campaign id required']);
        $r = $mysqli->query("SELECT * FROM email_campaigns WHERE id = {$cid} LIMIT 1");
        if ($r && $r->num_rows) {
            respond(['success' => true, 'campaign' => $r->fetch_assoc()]);
        } else {
            respond(['success' => false, 'message' => 'Campaign not found']);
        }
        break;

    case 'stop_campaign':
        $cid = intval($_REQUEST['campaign_id'] ?? 0);
        if (!$cid) respond(['success' => false, 'message' => 'Campaign id required']);
        $mysqli->query("UPDATE email_campaigns SET status='stopped' WHERE id={$cid}");
        respond(['success' => true]);
        break;

    case 'delete_campaigns':
        $ids = $_POST['ids'] ?? [];
        if (!is_array($ids) || empty($ids)) respond(['success' => false, 'message' => 'No campaigns selected']);
        $ids = array_map('intval', $ids);
        $ids_str = implode(',', $ids);
        $mysqli->query("DELETE FROM email_queue WHERE campaign_id IN ({$ids_str})");
        $mysqli->query("DELETE FROM email_campaigns WHERE id IN ({$ids_str})");
        respond(['success' => true, 'deleted' => count($ids)]);
        break;

    case 'preview':
        $subject = $_POST['subject'] ?? '';
        $message = $_POST['message'] ?? '';
        $site_name = htmlspecialchars($sm['config']['name'] ?? 'Site');
        $html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:700px;margin:10px auto;background:#fff;padding:20px;border:1px solid #eee">';
        $html .= '<h2 style="margin-top:0;">' . htmlspecialchars($subject) . '</h2>';
        $html .= '<div style="font-size:14px;line-height:1.5">' . $message . '</div>';
        $html .= '<hr><div style="font-size:12px;color:#999">© ' . date('Y') . ' ' . $site_name . '</div></div>';
        respond(['success' => true, 'html' => $html]);
        break;

    case 'process_campaign':
        $cid = intval($_REQUEST['campaign_id'] ?? 0);
        if (!$cid) respond(['success' => false, 'message' => 'Campaign id required']);
        $cq = $mysqli->query("SELECT * FROM email_campaigns WHERE id={$cid} LIMIT 1");
        if (!$cq || $cq->num_rows == 0) respond(['success' => false, 'message' => 'Invalid campaign']);
        $camp = $cq->fetch_assoc();

        if ($camp['status'] !== 'running') respond(['success' => false, 'message' => 'Not running']);
        $now = time();
        if (!empty($camp['scheduled_start']) && $camp['scheduled_start'] > $now) respond(['success' => false, 'message' => 'Scheduled later']);
        if (!empty($camp['next_run']) && $camp['next_run'] > $now) respond(['success' => false, 'message' => 'Cooling down']);

        if (empty($sm['config_email']['host'])) {
            $sm['config_email'] = [
                'host' => $sm['config']['smtp_host'] ?? 'server.richdatingnetwork.com',
                'port' => $sm['config']['smtp_port'] ?? 587,
                'secure' => $sm['config']['smtp_secure'] ?? 'tls',
                'user' => $sm['config']['smtp_user'] ?? 'contact@richdatingnetwork.com',
                'password' => $sm['config']['smtp_password'] ?? 'dj@Topaz27899310',
            ];
        }

        if (empty($sm['config_email']['user'])) {
            respond(['success' => false, 'message' => 'SMTP user not configured']);
        }

        $batch_size = intval($camp['batch_size']) ?: 100;

        $toSend = $mysqli->query("
            SELECT 
                q.id, 
                q.user_id, 
                q.email, 
                COALESCE(u.name, v.name) AS name,
                COALESCE(u.username, v.username) AS username
            FROM email_queue q
            LEFT JOIN users u ON q.user_id > 0 AND u.id = q.user_id
            LEFT JOIN users v ON q.user_id = 0 AND v.email = q.email AND v.fake = 0
            WHERE q.campaign_id = {$cid} AND q.sent = 0
            LIMIT {$batch_size}
        ");

        $sent = 0;

        if ($toSend && $toSend->num_rows) {
            require_once __DIR__ . '/../assets/includes/PHPMailer/PHPMailer.php';
            require_once __DIR__ . '/../assets/includes/PHPMailer/SMTP.php';

            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = $sm['config_email']['host'];
            $mail->Port = $sm['config_email']['port'];
            $mail->SMTPSecure = $sm['config_email']['secure'];
            $mail->SMTPAuth = true;
            $mail->Username = $sm['config_email']['user'];
            $mail->Password = $sm['config_email']['password'];
            $mail->CharSet = 'UTF-8';
            $mail->setFrom($sm['config_email']['user'], $camp['from_name'] ?: $sm['config']['name']);
            $mail->Sender = $sm['config_email']['user'];

            while ($row = $toSend->fetch_assoc()) {
                try {
                    $mail->clearAddresses();
                    $mail->addAddress($row['email']);

                    $displayName = 'Member';
                    $candidate = trim($row['name'] ?: $row['username'] ?: $row['email']);
                    if ($candidate && $candidate !== '') {
                        if (strpos($candidate, '@') !== false) {
                            $namePart = explode('@', $candidate)[0];
                            $namePart = preg_replace('/[._-].*$/', '', $namePart);
                            $displayName = ucfirst($namePart);
                        } else {
                            $displayName = $candidate;
                        }
                    }

                    $unsubLink = $sm['config']['site_url'] . 'unsubscribe.php?email=' . urlencode($row['email']) . '&token=' . md5($row['email'] . 'RICHSECRET2025');

                    $personalSubject = str_replace(
                        ['{NAME}', '{USERNAME}', '{EMAIL}', '{UNSUBSCRIBE_LINK}'],
                        [$displayName, $row['username'] ?? '', $row['email'], $unsubLink],
                        $camp['subject']
                    );

                    $personalBody = str_replace(
                        ['{NAME}', '{USERNAME}', '{EMAIL}', '{UNSUBSCRIBE_LINK}'],
                        [$displayName, $row['username'] ?? '', $row['email'], $unsubLink],
                        $camp['message']
                    );

                    $mail->isHTML(true);
                    $mail->Subject = $personalSubject;
                    $mail->Body    = $personalBody;

                    $mail->send();

                    $mysqli->query("UPDATE email_queue SET sent = 1, sent_at = " . time() . " WHERE id = " . $row['id']);
                    $sent++;
                    write_email_log("SENT to {$row['email']} (campaign {$cid}) – name: {$displayName}", 'SENT');
                } catch (Exception $e) {
                    write_email_log("FAILED: {$row['email']} | " . $e->getMessage(), 'ERROR');
                }
            }
        }

        $sent_total = $mysqli->query("SELECT COUNT(*) FROM email_queue WHERE campaign_id = {$cid} AND sent = 1")->fetch_row()[0];
        $total = $mysqli->query("SELECT COUNT(*) FROM email_queue WHERE campaign_id = {$cid}")->fetch_row()[0];
        $next_run = time() + ($camp['cooling_minutes'] * 60);
        $status = ($sent_total >= $total) ? 'finished' : 'running';
        $mysqli->query("UPDATE email_campaigns SET sent_recipients = {$sent_total}, next_run = " . ($status === 'finished' ? 0 : $next_run) . ", status = '{$status}' WHERE id = {$cid}");

        respond(['success' => true, 'sent' => $sent, 'total_sent' => $sent_total, 'status' => $status]);
        break;

    case 'process_all_ready':
        $now = time();
        $res = $mysqli->query("SELECT id FROM email_campaigns WHERE status = 'running' AND (next_run IS NULL OR next_run <= {$now})");
        $ids = [];
        while ($r = $res->fetch_assoc()) $ids[] = $r['id'];
        respond(['success' => true, 'ready_campaigns' => $ids]);
        break;

    case 'test_smtp':
        $to = trim($_POST['test_email'] ?? '');
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) respond(['success' => false, 'message' => 'Invalid email']);

        if (empty($sm['config_email']['user'])) respond(['success' => false, 'message' => 'SMTP user not set']);

        require_once __DIR__ . '/../assets/includes/PHPMailer/PHPMailer.php';
        require_once __DIR__ . '/../assets/includes/PHPMailer/SMTP.php';

        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = $sm['config_email']['host'];
            $mail->Port = $sm['config_email']['port'];
            $mail->SMTPSecure = $sm['config_email']['secure'];
            $mail->SMTPAuth = true;
            $mail->Username = $sm['config_email']['user'];
            $mail->Password = $sm['config_email']['password'];
            $mail->setFrom($sm['config_email']['user'], $sm['config']['name'] ?? 'Test');
            $mail->addAddress($to);
            $mail->isHTML(true);
            $mail->Subject = 'SMTP Test';
            $mail->Body = '<p>Test email sent successfully from your system.</p>';
            $mail->send();
            respond(['success' => true, 'message' => 'Test email sent to ' . $to]);
        } catch (Exception $e) {
            respond(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
        break;

    default:
        respond(['success' => false, 'message' => 'Invalid action']);
}
?>