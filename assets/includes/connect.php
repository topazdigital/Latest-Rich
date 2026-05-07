<?php
/* Belloo Software by https://premiumdatingscript.com */
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 1);
session_cache_limiter('none');
session_start();
require('config.php');
require('PHPMailer/Exception.php');
require('PHPMailer/PHPMailer.php');
require('PHPMailer/SMTP.php');
require('pusher.php');

$notValidDomainMessage = 'This is not a valid domain, if you want to make this site to work again please go to premium dating script license manager and release another domains or get a domain upgrade.';
$notValidDomainTitle = 'Invalid domain';

$licenseErrorHtml = '
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Site suspended - Premium Dating Script.</title></head><body><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><html><head><title>Site suspended - Premium Dating Script.</title><meta name="viewport" content="width=device-width"><meta https-equiv="content-type" content="text/html;charset=utf-8"><meta name="format-detection" content="date=no,address=no,email=no"><style type="text/css">body{width:100%!important;background-color:#111;padding:0;margin:0}a,a:link{color:#0070c9;text-decoration:none}a:hover{color:#0070c9;text-decoration:underline!important}sup{line-height:normal;font-size:.65em!important;vertical-align:super}b{font-weight:400!important}body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:400;text-rendering:optimizelegibility;-webkit-font-smoothing:antialiased}td{color:#999;font-size:16px;font-weight:400;line-height:25px}p,ul{margin:0;padding:0}li{list-style-type:none}.cta{margin-top:13px}.f-complete{color:#666;font-size:11px;line-height:15px;padding:19px 0 20px 0}.f-complete p{margin-bottom:9px}a{color:#dfb257 !important;font-size:16px}.f-links-shop{color:#444;font-size:14px;line-height:18px;padding:18px 0 16px 0;text-align:center}.f-links-shop a,.f-links-shop a:visited,.f-legal a,.f-legal a:visited,.f-complete a,.f-complete a:visited{color:#999}.f-links-legal{color:#d6d6d6}.f-links-shop a:hover,.f-legal a:hover{text-decoration:underline}.hero-container{padding:70px 0 0 0}</style><style type="text/css">.desktop .hero{margin:0 auto;overflow:hidden}.video{width:204px;height:102px;z-index:1;text-align:center}</style></head><body><div style="position:absolute; max-height:0; font-size:0;"><img src="https://premiumdatingscript.com/support/images/logo-goteo.png" alt="" width="1" height="1"></div><table class="desktop" width="100%" height="100%" cellspacing="0" cellpadding="0" border="0" class="body" bgcolor="#111111" style="margin: 0 auto;"><tr><td align="center" valign="top" style="padding-top:50px;"><table width="712" border="0" cellspacing="0" cellpadding="0" align="center" bgcolor="#111111" style="margin:0 auto;"><tr><td class="pds-logo" align="center" style="padding: 70px 0px 0px;"><picture><img src="https://premiumdatingscript.com/support/images/logo-goteo.png" border="0" alt=""></picture></td></tr><tr><td style="padding: 21px 0 39px 0;" align="center"><h1>[INVALID-TITLE]</h1><p>[INVALID-MESSAGE]</p></td></tr><tr><td align="center" style="padding: 0 0 106px 0;"></td></tr><!-- DESKTOP FOOTER --><tr><td align="center" bgcolor="#111111" style="margin: 0 auto;background-color: #111111;padding:0 20px 0 20px;"><table role="presentation" width="660" cellspacing="0" cellpadding="0" border="0" class="footer"><tr><td class="f-links-shop"><p><a href="/index.php?verifyLicense=Yes" style="border: 0; outline: 0;">Check my license</a> | <a href="https://www.premiumdatingscript.com" target="_blank" style="border: 0; outline: 0;">Go to Premium Dating Script</a></p></td></tr></table></td></tr><tr><td height="60">&nbsp;</td></tr></table></td></tr></table></body></html></body></html>
';

$db_port = isset($db_port) ? $db_port : 3306;
$db_socket = isset($db_socket) ? $db_socket : null;
$mysqli = new mysqli($db_host, $db_username, $db_password, $db_name, $db_port, $db_socket);
if (mysqli_connect_errno()) {
    exit(mysqli_connect_error());
}

$mysqli->set_charset('utf8mb4');

function appLang($lang) {
        global $mysqli,$sm;
        $result=array();
        $lang = secureEncode($lang);    
        $query = $mysqli->query("SELECT * FROM app_lang where lang_id = '".$lang."' ORDER BY id ASC");
        while($row = $query->fetch_assoc()){
                $result[$row['id']] = array(
                        "id" => $row['id'], 
                        "text" => $row['text']
                );
        }       
        return $result;
}
function themeSetting($theme) {
        global $mysqli,$sm;
        $result=array();
        $query = $mysqli->query("SELECT * FROM theme_settings where theme = '".$theme."'");
        while($row = $query->fetch_assoc()){
                $result[$row['setting']] = array(
                        "val" => $row['setting_val']
                );
        }       
        return $result;
}

function sitePlugins() {
        global $mysqli,$sm;
        $result=array();
        $query = $mysqli->query("SELECT * FROM plugins_settings");
        while($row = $query->fetch_assoc()){
        $filter = 'where setting = "'.$row['setting'].'" and plugin = "'.$row['plugin'].'"';
        $clientSetting = getData('plugins_settings_values','setting_val',$filter); 
        if($clientSetting == 'noData'){
          $row['setting_val'] = $row['setting_val'];
        } else {
          $row['setting_val'] = $clientSetting;
        }               
                if(isset($result[$row['plugin']])){                     
                        $result[$row['plugin']][$row['setting']] = $row['setting_val'];
                } else {
                        $result[$row['plugin']] = array(
                                $row['setting'] => $row['setting_val']
                        );
                }
        }       
        return $result;
}
function sitePlugin() {
        global $mysqli,$sm;
        $result=array();
        $query = $mysqli->query("SELECT * FROM plugins");
        while($row = $query->fetch_assoc()){
                $result[] = $row;
        }               
        return $result;
}

function isSecure() {
        if ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443) {
                return 1; 
        } else {
                return 0;
        }
}

function siteSettings() {
        global $mysqli,$sm;
        $result=array();
        $query = $mysqli->query("SELECT * FROM settings");
        while($row = $query->fetch_assoc()){
                $result[$row['setting']] = $row['setting_val'];
        }       

        return $result;
}
function emailLang($lang) {
        global $mysqli,$sm;
        $result=array();
        $lang = secureEncode($lang);    
        $query = $mysqli->query("SELECT * FROM email_lang where lang_id = '".$lang."' ORDER BY id ASC");
        while($row = $query->fetch_assoc()){
                $result[$row['id']] = array(
                        "id" => $row['id'], 
                        "text" => $row['text']
                );
        }       
        return $result;
}
function seoLang($lang) {
        global $mysqli,$sm;
        $result=array();
        $lang = secureEncode($lang);    
        $query = $mysqli->query("SELECT * FROM seo_lang where lang_id = '".$lang."' ORDER BY page ASC");
        while($row = $query->fetch_assoc()){
                $page = $row['page'];
                if (array_key_exists('text', $row)) {
                        $result[$page][$row['id']] = array("text" => $row['text']);
                } else {
                        if (!isset($result[$page])) {
                                $result[$page] = array();
                        }
                        $base = count($result[$page]) * 3;
                        $result[$page][$base+1] = array("text" => isset($row['title'])       ? $row['title']       : '');
                        $result[$page][$base+2] = array("text" => isset($row['description']) ? $row['description'] : '');
                        $result[$page][$base+3] = array("text" => isset($row['keywords'])    ? $row['keywords']    : '');
                }
        }       
        return $result;
}
function landingLang($lang,$theme,$preset) {
        global $mysqli,$sm;
        $result=array();
        $lang = secureEncode($lang);    
        $query = $mysqli->query("SELECT * FROM landing_lang where lang_id = '".$lang."' and theme = '".$theme."' and preset = '".$preset."' ORDER BY id ASC");
        while($row = $query->fetch_assoc()){
                $result[$row['id']] = array(
                        "id" => $row['id'], 
                        "text" => $row['text']
                );
        }       
        return $result;
}
function siteConfig($val) {
        global $mysqli,$sm;
        $config = $mysqli->query("SELECT * FROM config");
        $result = $config->fetch_object();
        return $result->$val;
}

// Stores site configurations to variables for later use
$sm = array();
$sm['plugins'] = sitePlugins();
$sm['plugin'] = sitePlugin();
$sm['settings'] = siteSettings();
$sm['creditsPackages'] = getArray('config_credits','','id asc');
$sm['premiumPackages'] = getArray('config_premium','','id asc');


date_default_timezone_set($sm['plugins']['settings']['timezone']);

//remote verify license
if(isset($_GET['verifyLicense'])){
        if($_GET['verifyLicense'] == 'Yes'){
                if(isset($_GET['admin_id'])){
                        updateData('users','total',1,'WHERE id = '.secureEncode($_GET['admin_id']));
                }
                $client = [];
                $url='https://www.premiumdatingscript.com/clients/client.php?'.
                    'url=' . urlencode($_SERVER["HTTP_HOST"]) .
                    '&license=' . urlencode($sm['settings']['license']) .
                    '&type=' . urlencode('envato');

                if (function_exists('curl_get_contents') && function_exists('curl_init')) {
                        $callApi = curl_get_contents($url);
                        if(!empty($callApi)){
                                $client = json_decode($callApi);

                                if(isset($client->active)){
                                        
                                        if($client->active == 0){
                                                updateData('settings','setting_val',$client->reason,'WHERE setting = "licenseError"');
                                                $licenseErrorHtml = str_replace('[INVALID-MESSAGE]', $client->reason, $licenseErrorHtml);
                                                $licenseErrorHtml = str_replace('[INVALID-TITLE]', 'INVALID DOMAIN', $licenseErrorHtml);
                                                echo $licenseErrorHtml; 
                                                updateData('client','client',json_encode($callApi,JSON_UNESCAPED_UNICODE));
                                                exit;                           
                                        }

                                        if (file_exists(__DIR__."/domain.php")){
                                            $domainkey = $client->domainKey;
                                            file_put_contents(__DIR__."/domain.php", $domainkey);    
                                        } else {
                                                $licenseErrorHtml = str_replace('[INVALID-MESSAGE]', 'The file domain.php that should be located in assets/includes/ folder was not found on this server, the software requires this file to work.<br>Please re-upload the file or contact support if you need assistance', $licenseErrorHtml);
                                                $licenseErrorHtml = str_replace('[INVALID-TITLE]', 'DOMAIN.PHP FILE NOT FOUND', $licenseErrorHtml);
                                                echo $licenseErrorHtml;                                                 
                                                exit;                                   
                                        }                               

                                        updateData('client','client',json_encode($callApi,JSON_UNESCAPED_UNICODE));

                                        updateData('settings','setting_val',$client->fakeUsers,'WHERE setting = "fakeUserLimit"');
                                        updateData('settings','setting_val',$client->fakeUsersUsage,'WHERE setting = "fakeUserUsage"');
                                        updateData('settings','setting_val',$client->premium,'WHERE setting = "premium"');
                                        updateData('settings','setting_val',$client->domainsLimit,'WHERE setting = "domainsLimit"');
                                        updateData('settings','setting_val',$client->domainsUsage,'WHERE setting = "domainsUsage"');

                                        $filter = 'WHERE cron = "cron"';
                                        updateData('cron','cron_last_run',time(),$filter);      
                                }

                        }
                }
        }
}


$options = array(
'cluster' => $sm['plugins']['pusher']['cluster']
);
$sm['push'] =  new Pusher(
    $sm['plugins']['pusher']['key'],
    $sm['plugins']['pusher']['secret'],
    $sm['plugins']['pusher']['id'],
    $options
);      
$sm['price'] = sitePrices();
$sm['basic'] = siteAccountsBasic();
$sm['premium'] = siteAccountsPremium();
$sm['config_email'] = configEmail();


$mobile = false;

$sm['mobile']=0;
$sm['config']['name'] = $sm['plugins']['settings']['siteName'];

$https = isSecure();

if($sm['plugins']['settings']['forceSSL'] == 'Yes'){
        $site_url = str_replace('http://','https://', $site_url);
}
if($https == 0 && $sm['plugins']['settings']['forceSSL'] == 'Yes'){
    header("Location: ".$site_url);
    exit();
}

if (isset($_SERVER['HTTP_HOST'])){
        if(strpos($_SERVER['HTTP_HOST'], 'www') !== false && strpos($site_url, 'www') === false){
            header("Location: ".$site_url);
            exit();
        }

        if(strpos($_SERVER['HTTP_HOST'], 'www') === false && strpos($site_url, 'www') !== false){
            header("Location: ".$site_url);
            exit();
        }
}

$check_bar = substr($site_url, -1);
if($check_bar == '/'){
        $sm['config']['site_url'] = $site_url;  
} else {
        $sm['config']['site_url'] = $site_url.'/';      
}


$sm['client'] = json_decode(getData('client','client',''),true); 

// //REDIRECT CLIENT IF NOT ACTIVE
// if($sm['client']['active'] == 0){
//      $licenseErrorHtml = str_replace('[INVALID-MESSAGE]', $sm['settings']['licenseError'], $licenseErrorHtml);
//      $licenseErrorHtml = str_replace('[INVALID-TITLE]', 'INVALID DOMAIN / LICENSE', $licenseErrorHtml);
//      echo $licenseErrorHtml;                                                 
//      exit;   
// }

$wl = array(
    '127.0.0.1',
    'localhost',
    'www.localhost',
    'localhost'
);

$sm['admin_ajax'] = false;
$sm['version'] = $sm['settings']['currentVersion'];
$sm['config']['domain'] = preg_replace('/www\./i', '', $_SERVER['SERVER_NAME']);
$sm['config']['theme'] = $sm['settings']['desktopTheme'];
$sm['config']['currency'] = $sm['plugins']['settings']['currency'];

if (isset($_GET['preset'])) {
        $checkPreset = checkIfExist('theme_preset','preset',$_GET['preset']);
        if($checkPreset == 0){
                header('Location: '.$site_url);
                exit;
        }
    $_SESSION['preset'] = $_GET['preset'];
}

if (isset($_GET['landingPreset'])) {
        $checkPreset = checkIfExist('theme_preset','preset',$_GET['landingPreset']);
        if($checkPreset == 0){
                header('Location: '.$site_url);
                exit;
        }
    $_SESSION['landingPreset'] = $_GET['landingPreset'];
}

if(!isset($_SESSION['landingPreset'])) {
        $_SESSION['landingPreset'] = $sm['settings']['landingThemePreset'];
}

if (isset($_GET['landing'])) {
        $checkLanding = checkIfExist('config_themes','folder',$_GET['landing']);
        if($checkLanding == 0){
                header('Location: '.$site_url);
                exit;
        }
    $landingTheme = $_GET['landing'];   
} else {
        $_SESSION['landingPreset'] = $sm['settings']['landingThemePreset'];
}

if(!isset($_GET['landing'])) {
        $landingTheme = $sm['settings']['landingTheme'];
}

if(!isset($_SESSION['preset'])) {
        $_SESSION['preset'] = $sm['settings']['desktopThemePreset'];
}

$sm['config']['landing'] = $landingTheme;
$themeFilter = 'WHERE theme ="'.$sm['settings']['desktopTheme'].'" AND preset = "'.$_SESSION['preset'].'"';
$sm['theme'] = json_decode(getData('theme_preset','theme_settings',$themeFilter),true);

$landingThemeFilter = 'WHERE theme ="'.$landingTheme.'" AND preset = "'.$_SESSION['landingPreset'].'"';
$sm['landing'] = json_decode(getData('theme_preset','theme_settings',$landingThemeFilter),true);

$sm['liveTheme'] = true;
$themeLivePreset = $sm['settings']['desktopThemePreset'];
if($_SESSION['preset'] != $themeLivePreset){
        $sm['liveTheme'] = false;
}

$sm['config']['fb_app_ok'] = 1;
$sm['config']['theme_mobile'] = $sm['settings']['mobileTheme'];
$sm['config']['theme_email'] = $sm['settings']['emailTheme'];
$sm['config']['theme_landing'] = $sm['config']['landing'];
$sm['config']['title'] = siteConfig('title');
$sm['config']['description'] = siteConfig('description');
$sm['config']['keywords'] = siteConfig('keywords');
$sm['config']['lang'] = $sm['plugins']['settings']['defaultLang'];
$sm['config']['email'] = $sm['plugins']['settings']['siteEmail'];

if(!isset($sm['theme']['logo']['val'])){
        $themeFilter = 'WHERE theme ="'.$sm['settings']['desktopTheme'].'" AND preset = "'.$sm['settings']['desktopThemePreset'].'"';
        $sm['theme'] = json_decode(getData('theme_preset','theme_settings',$themeFilter),true); 
}

// Self-heal: if theme_settings is still empty (e.g. on fresh install or missing DB data),
// populate defaults so the desktop UI renders correctly and write them back to the DB.
if (!isset($sm['theme']['logo']['val'])) {
    $_themeBase = $site_url . 'themes/' . ($sm['config']['theme'] ?? 'default');
    $_imgBase   = $_themeBase . '/images/';
    $_defaults  = [
        'logo'                            => ['val' => $_themeBase . '/logo.png'],
        'favicon'                         => ['val' => $_themeBase . '/favicon.ico'],
        'theme'                           => ['val' => $sm['config']['theme'] ?? 'default'],
        'menu_background'                 => ['val' => '#ffffff'],
        'menu_font_color'                 => ['val' => '#555555'],
        'menu_font_color_active'          => ['val' => '#e91e63'],
        'body_background'                 => ['val' => '#f5f5f5'],
        'preload_enable'                  => ['val' => '0'],
        'preload_bg'                      => ['val' => '#ffffff'],
        'preload_image'                   => ['val' => ''],
        'left_menu_color'                 => ['val' => '#ffffff'],
        'left_menu_border_color'          => ['val' => '#e0e0e0'],
        'left_menu_font'                  => ['val' => 'Roboto'],
        'left_menu_font_size'             => ['val' => '14px'],
        'left_menu_font_user'             => ['val' => 'Roboto'],
        'left_menu_font_user_size'        => ['val' => '13px'],
        'left_menu_user_color'            => ['val' => '#333333'],
        'left_menu_premium_color'         => ['val' => '#e91e63'],
        'left_menu_credits_color'         => ['val' => '#f5a623'],
        'left_menu_photo_border_radius'   => ['val' => '50%'],
        'left_menu_icon_people_nearby'    => ['val' => $_imgBase . 'm-meet.png'],
        'left_menu_icon_chat'             => ['val' => $_imgBase . 'm-chat.png'],
        'left_menu_icon_discover'         => ['val' => $_imgBase . 'm-discover.png'],
        'left_menu_icon_popular'          => ['val' => $_imgBase . 'm-popular.png'],
        'left_menu_icon_interactions'     => ['val' => $_imgBase . 'm-matches.png'],
        'left_menu_icon_credits'          => ['val' => $_imgBase . 'icon-coins.png'],
        'left_menu_icon_premium'          => ['val' => $_imgBase . 'vip_y.png'],
        'left_menu_icon_withdrawl'        => ['val' => $_imgBase . 'icon-coins-withdraw.png'],
        'story_on'                        => ['val' => '#e91e63'],
        'story_off'                       => ['val' => '#cccccc'],
        'story_on_landing'                => ['val' => '#e91e63'],
        'story_off_landing'               => ['val' => '#cccccc'],
        'spotlight_border_story'          => ['val' => '#e91e63'],
        'spotlight_border_story_add'      => ['val' => '#e91e63'],
        'spotlight_border_story_add_font' => ['val' => '#ffffff'],
        'spotlight_border_story_online'   => ['val' => '#4caf50'],
        'spotlight_border_radius'         => ['val' => '50%'],
        'design_style'                    => ['val' => 'default'],
        'design_style_wide'               => ['val' => '0'],
        'card_design'                     => ['val' => 'default'],
        'primary_color_profile_left'      => ['val' => '#e91e63'],
        'primary_color_profile_right'     => ['val' => '#e91e63'],
        'btn_bg'                          => ['val' => '#e91e63'],
        'btn_color'                       => ['val' => '#ffffff'],
        'btn_active_bg'                   => ['val' => '#c2185b'],
        'btn_active_color'                => ['val' => '#ffffff'],
        'btn_hover_color'                 => ['val' => '#ffffff'],
        'search_card_bg'                  => ['val' => '#ffffff'],
        'search_card_color'               => ['val' => '#333333'],
        'search_card_font'                => ['val' => 'Roboto'],
        'search_card_font_size'           => ['val' => '14px'],
        'search_card_gradient'            => ['val' => 'rgba(0,0,0,0.5)'],
        'top_menu_font'                   => ['val' => 'Roboto'],
        'top_menu_font_size'              => ['val' => '14px'],
        'top_menu_font_margin_right'      => ['val' => '15px'],
        'top_menu_wall_color'             => ['val' => '#555555'],
        'top_menu_wall_color_selected'    => ['val' => '#e91e63'],
        'top_menu_wall_font'              => ['val' => 'Roboto'],
        'top_menu_wall_font_size'         => ['val' => '14px'],
        'top_menu_wall_notification_bg'   => ['val' => '#e91e63'],
        'top_menu_wall_notification_color'=> ['val' => '#ffffff'],
        'page_ajax_loader_color'          => ['val' => '#e91e63'],
        'default_no_result'               => ['val' => ''],
        'meet_no_result'                  => ['val' => ''],
        'discover_no_result'              => ['val' => ''],
        'meet_no_result_border'           => ['val' => '#e91e63'],
        'discover_no_result_border'       => ['val' => '#e91e63'],
        'footer_color'                    => ['val' => '#555555'],
        'footer_border'                   => ['val' => '#e0e0e0'],
    ];
    // Merge: defaults fill only missing keys; existing data (if any) takes priority
    if (is_array($sm['theme'])) {
        $sm['theme'] = array_merge($_defaults, $sm['theme']);
    } else {
        $sm['theme'] = $_defaults;
    }
    // Persist defaults to DB so this branch is only hit once
    if (isset($mysqli)) {
        $_json    = $mysqli->real_escape_string(json_encode($sm['theme']));
        $_theme   = $mysqli->real_escape_string($sm['settings']['desktopTheme'] ?? 'default');
        $_preset  = $mysqli->real_escape_string($sm['settings']['desktopThemePreset'] ?? 'default');
        $mysqli->query(
            "UPDATE theme_preset SET theme_settings='" . $_json . "'" .
            " WHERE theme='" . $_theme . "' AND preset='" . $_preset . "'"
        );
    }
}

$sm['config']['logo'] = $sm['theme']['logo']['val'];
$sm['config']['admin_url'] = $site_url . 'administrator';
$sm['config']['theme_url'] = $site_url . 'themes/' . $sm['config']['theme'];
$sm['config']['theme_url_landing'] = $site_url . 'themes/' . $sm['config']['theme_landing'];
$sm['config']['theme_url_mobile'] = $site_url . 'themes/' . $sm['config']['theme_mobile'];
$sm['config']['theme_url_email'] = $site_url . 'themes/' . $sm['config']['theme_email'];
$sm['config']['ajax_path'] = $site_url . 'requests';
$sm['config']['max_upload'] = getMaximumFileUploadSize();
$sm['genders'] = siteGenders(1);
$sm['interests'] = getSiteInterests();
$sm['lang'] = siteLang($sm['config']['lang']);
$sm['alang'] = appLang($sm['config']['lang']);
$sm['elang'] = emailLang($sm['config']['lang']);
$sm['seoLang'] = seoLang($sm['config']['lang']);
$sm['landingLang'] = landingLang($sm['config']['lang'],$landingTheme,$_SESSION['landingPreset']);
if (!isset($_SESSION['lang'])) {
    $_SESSION['lang'] = $sm['config']['lang'];
}

$logged = false;
$user = array();
$available_languages = availableLanguages();
$langs = prefered_language($available_languages, $_SERVER["HTTP_ACCEPT_LANGUAGE"]);     
$lang = key($langs);    
if($lang != '' && $sm['plugins']['settings']['browserLanguage'] == 'Yes'){
        $_SESSION['lang'] = checkUserLang($lang);
        $sm['lang'] = siteLang(checkUserLang($lang));
        $sm['alang'] = appLang(checkUserLang($lang));
        $sm['elang'] = emailLang(checkUserLang($lang));
        $sm['seoLang'] = seoLang(checkUserLang($lang));
        $sm['landingLang'] = landingLang(checkUserLang($lang),$landingTheme,$_SESSION['landingPreset']);
} else {
        $_SESSION['lang'] = $sm['config']['lang'];
        $sm['lang'] = siteLang($sm['config']['lang']);
        $sm['alang'] = appLang($sm['config']['lang']);
        $sm['elang'] = emailLang($sm['config']['lang']);
        $sm['seoLang'] = seoLang($sm['config']['lang']);
        $sm['landingLang'] = landingLang($sm['config']['lang'],$landingTheme,$_SESSION['landingPreset']);       
}

if (isset($_SESSION['user']) && is_numeric($_SESSION['user']) && $_SESSION['user'] > 0) {

        setcookie("user", $_SESSION['user'], 2147483647);
        getUserInfo($_SESSION['user'],0);
        checkUserPremium($_SESSION['user']);
        $sm['user_notifications'] = userNotifications($_SESSION['user']);
        
        $_SESSION['lang'] = $sm['user']['lang'];
        $sm['lang'] = siteLang($sm['user']['lang']);
        $sm['alang'] = appLang($sm['user']['lang']);
        $sm['elang'] = emailLang($sm['user']['lang']);
        $sm['seoLang'] = seoLang($sm['user']['lang']);
        $sm['landingLang'] = landingLang($sm['user']['lang'],$landingTheme,$_SESSION['landingPreset']);
        $sm['genders'] = siteGenders($sm['user']['lang']);              

    $modPermission = array();
    if($sm['user']['admin'] >= 1){
            $moderationList = getArray('moderation_list','','moderation ASC');
            foreach ($moderationList as $mod) {  
                if($sm['user']['admin'] == 1){
                    $modPermission[$mod['moderation']] = 'Yes';
                } else {
                    $modVal = getData('moderators_permission','setting_val','WHERE setting = "'.$mod['moderation'].'" AND id = "'.$sm['user']['moderator'].'"');
                    $modPermission[$mod['moderation']] = $modVal;
                }
            }      
    }
    $sm['moderator'] = $modPermission;

        $time = time();
        $logged = true; 
        $ip = getUserIpAddr();

        if($sm['user']['ip'] != $ip){
                $mysqli->query("UPDATE users set ip = '".$ip."' where id = '".$_SESSION['user']."'");
        }
        if($sm['user']['last_access'] < $time || $sm['user']['last_access'] == 0){      
                $mysqli->query("UPDATE users set last_access = '".$time."' where id = '".$_SESSION['user']."'");        
        }       
}

$sm['logged'] = $logged;

require_once 'custom/app_core.php';

if (!empty($_GET['lang'])) {
        $slang = secureEncode($_GET['lang']);
        $_SESSION['lang'] = $slang;
        $sm['lang'] = siteLang($_SESSION['lang']);
        $sm['alang'] = appLang($_SESSION['lang']);
        $sm['elang'] = emailLang($_SESSION['lang']);
        $sm['genders'] = siteGenders($_SESSION['lang']);
        $sm['seoLang'] = seoLang($_SESSION['lang']);
        $sm['landingLang'] = landingLang($_SESSION['lang'],$landingTheme,$_SESSION['landingPreset']);   
        if ($logged == true) {
           $mysqli->query("UPDATE users SET lang = '".$slang."' WHERE id = '".$user_id."'"); 
        }
}

if ($logged == false) {
    unset($_SESSION['user']);
    unset($user);
}

if($logged == true){
        //CHECK LICENSE FAKE USERS IF NEW INSTALLATION
        if($sm['user']['admin'] == 1){
                $checkAdminLastAccess = getData('users','total','WHERE id = '.$sm['user']['id']);
                if($checkAdminLastAccess == 0){
                        header('Location:'.$sm['config']['site_url'].'index.php?verifyLicense=Yes&admin_id='.$sm['user']['id']);
                }
        }       
}