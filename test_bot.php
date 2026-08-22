<?php
require_once __DIR__ . '/lottery_engine.php';
require_once __DIR__ . '/stats_algorithm.php';

$draws = [
    [
        'expect' => '20231010001',
        'openCode' => '1,2,3,4,5,6,7',
        'time' => '2023-10-10 10:00:00'
    ],
    [
        'expect' => '20231010000',
        'openCode' => '10,11,12,13,14,15,16',
        'time' => '2023-10-10 09:57:00'
    ]
];

$msgText = generateAutomatedPushReportPHP($draws);
echo $msgText;
