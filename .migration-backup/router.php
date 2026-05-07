<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

$docRoot = __DIR__;
$file = $docRoot . $uri;

// Serve static files directly with caching headers
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $cacheExts = ['css','js','png','jpg','jpeg','gif','svg','ico','woff','woff2','ttf','eot','mp3','mp4','webm','ogg'];
    if (in_array($ext, $cacheExts)) {
        $mimeMap = [
            'css'  => 'text/css',
            'js'   => 'application/javascript',
            'png'  => 'image/png',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif'  => 'image/gif',
            'svg'  => 'image/svg+xml',
            'ico'  => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2'=> 'font/woff2',
            'ttf'  => 'font/ttf',
            'eot'  => 'application/vnd.ms-fontobject',
            'mp3'  => 'audio/mpeg',
            'mp4'  => 'video/mp4',
            'webm' => 'video/webm',
            'ogg'  => 'audio/ogg',
        ];
        $maxAge = 86400 * 7; // 7 days
        $lastMod = filemtime($file);
        $etag = md5($lastMod . $file);

        // Check conditional request
        if (
            (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) ||
            (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) >= $lastMod)
        ) {
            http_response_code(304);
            exit;
        }

        header('Content-Type: ' . ($mimeMap[$ext] ?? 'application/octet-stream'));
        header('Cache-Control: public, max-age=' . $maxAge);
        header('Expires: ' . gmdate('D, d M Y H:i:s', time() + $maxAge) . ' GMT');
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastMod) . ' GMT');
        header('ETag: ' . $etag);
        readfile($file);
        exit;
    }
    return false;
}

// Handle .htaccess-style rewrites for PHP built-in server
$query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
$queryStr = $query ? '?' . $query : '';

// Strip leading slash
$path = ltrim($uri, '/');

// administrator/editor/theme routes
if (preg_match('#^administrator/editor/theme/([A-Za-z0-9-]+)/([A-Za-z0-9-]+)/?$#', $path, $m)) {
    $_GET['theme'] = $m[1];
    $_GET['preset'] = $m[2];
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/administrator/editor/index.php';
    return;
}

// administrator routes
if (preg_match('#^administrator/([A-Za-z0-9-]+)/?$#', $path, $m)) {
    $_GET['page'] = 'admin';
    $_GET['p'] = $m[1];
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/index.php';
    return;
}

// profile routes
if (preg_match('#^profile/([0-9]+)/([A-Za-z0-9-]+)/?$#', $path, $m)) {
    $_GET['page'] = 'profile';
    $_GET['id'] = $m[1];
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/index.php';
    return;
}

// @username routes
if (preg_match('#^@([A-Za-z0-9_.]+)/?$#', $path, $m)) {
    $_GET['page'] = 'profile';
    $_GET['id'] = $m[1];
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/index.php';
    return;
}

// @username/section routes
if (preg_match('#^@([A-Za-z0-9-]+)/([A-Za-z0-9-]+)?$#', $path, $m)) {
    $_GET['page'] = 'profile';
    $_GET['id'] = $m[1];
    $_GET['s'] = $m[2] ?? '';
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/index.php';
    return;
}

// m_profile routes
if (preg_match('#^m_profile/([0-9]+)/([A-Za-z0-9-]+)/?$#', $path, $m)) {
    $_GET['page'] = 'profile';
    $_GET['id'] = $m[1];
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/mobile.php';
    return;
}

// mobile app routes — serve mobile/index.php for all /mobile paths (AngularJS HTML5 mode)
if ($path === 'mobile' || $path === 'mobile/' || strpos($path, 'mobile/') === 0) {
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/mobile/index.php';
    return;
}

// chat routes
if (preg_match('#^chat/([0-9]+)/([A-Za-z0-9-]+)/?$#', $path, $m)) {
    $_GET['page'] = 'chat';
    $_GET['id'] = $m[1];
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/index.php';
    return;
}

// search routes -> logout
if (preg_match('#^search/#', $path)) {
    $_GET['page'] = 'logout';
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/index.php';
    return;
}

// Single segment routes
if (preg_match('#^([A-Za-z0-9-]+)/?$#', $path, $m) && $path !== '') {
    $_GET['page'] = $m[1];
    parse_str($query ?? '', $extra); $_GET = array_merge($_GET, $extra);
    require $docRoot . '/index.php';
    return;
}

// Default: serve index.php
require $docRoot . '/index.php';
