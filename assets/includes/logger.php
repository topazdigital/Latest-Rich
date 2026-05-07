<?php
// Simple file logger helper used for email/campaign errors.
// Path: assets/includes/logger.php

/**
 * Append a timestamped message to the email error log.
 *
 * @param string $message The message to write.
 * @param string $level Optional level e.g. ERROR, WARN, INFO
 * @return void
 */
function write_email_log($message, $level = 'ERROR') {
    $logDir = __DIR__ . '/../logs';
    $logFile = $logDir . '/email_errors.log';

    // Ensure directory exists
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }

    $time = gmdate('Y-m-d H:i:s'); // UTC timestamp
    $line = sprintf("[%s] [%s] %s%s", $time, $level, trim($message), PHP_EOL);

    // atomic append with lock
    @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
}