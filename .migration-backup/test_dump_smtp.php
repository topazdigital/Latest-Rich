<?php
// test_dump_smtp.php (place in site root temporarily)
require_once __DIR__ . '/assets/includes/core.php'; // adjust path if needed
header('Content-Type: text/plain');
if (!isset($sm['config_email'])) {
    echo "No config_email found in \$sm\n";
    var_export($sm);
    exit;
}
echo "config_email:\n";
var_export($sm['config_email']);
echo "\n\nSite config email keys (for comparison):\n";
echo 'sm[config][email] = ' . ($sm['config']['email'] ?? '[missing]') . PHP_EOL;
echo 'sm[config_email][host] = ' . ($sm['config_email']['host'] ?? '[missing]') . PHP_EOL;
echo 'sm[config_email][port] = ' . ($sm['config_email']['port'] ?? '[missing]') . PHP_EOL;
echo 'sm[config_email][user] = ' . ($sm['config_email']['user'] ?? '[missing]') . PHP_EOL;
echo 'sm[config_email][password] = ' . (empty($sm['config_email']['password']) ? '[hidden or empty]' : '[set]') . PHP_EOL;