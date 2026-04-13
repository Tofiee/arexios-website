<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache');

$ts3_host = '127.0.0.1';
$ts3_query_port = 10011;
$ts3_server_id = 1;

$socket = @fsockopen($ts3_host, $ts3_query_port, $errno, $errstr, 2);

if (!$socket) {
    echo json_encode([
        'status' => 'offline',
        'players' => 0,
        'max_players' => 0,
        'error' => 'Connection failed'
    ]);
    exit;
}

$output = '';
fgets($socket);

fwrite($socket, "use sid=$ts3_server_id\r\n");
while (!feof($socket)) { $output .= fgets($socket, 1024); }

fwrite($socket, "serverinfo\r\n");
while (!feof($socket)) {
    $line = fgets($socket, 1024);
    $output .= $line;
    if (strpos($line, 'error id=0') !== false) break;
}

fwrite($socket, "quit\r\n");
fclose($socket);

preg_match('/virtualserver_clientsonline=(\d+)/', $output, $online);
preg_match('/virtualserver_maxclients=(\d+)/', $output, $max);
preg_match('/virtualserver_name=([^\r\n]+)/', $output, $name);

$players = isset($online[1]) ? intval($online[1]) : 0;
$max_players = isset($max[1]) ? intval($max[1]) : 0;

if ($players > 0) $players -= 1;

echo json_encode([
    'status' => 'online',
    'players' => $players,
    'max_players' => $max_players,
    'name' => isset($name[1]) ? trim($name[1]) : 'TeamSpeak Server'
]);
