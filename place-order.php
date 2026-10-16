<?php
session_start();
require 'db/database.php';
require_once __DIR__ . '/app/rider_assign.php';
require_once __DIR__ . '/app/kitchen_ops.php';

kk_kitchen_ensure_schema($pdo);

/* REQUIRE LOGIN + CART */
if (!isset($_SESSION['user']) || empty($_SESSION['cart'])) {
    header("Location: index.php");
    exit;
}

$user_id = $_SESSION['user']['id'];
$shop_id = $_SESSION['cart_shop_id'];

/* BARANGAY DISTANCES (SERVER SOURCE OF TRUTH) */
$barangayDistances = require __DIR__ . '/data/barangay_pototan.php';

/* FORM INPUTS */
$fulfillment = (string) ($_POST['fulfillment'] ?? 'delivery');
if ($fulfillment !== 'pickup') {
    $fulfillment = 'delivery';
}

$barangay = (string) ($_POST['barangay'] ?? '');
$delivery_address = trim((string) ($_POST['delivery_address'] ?? ''));
$pickup_time = trim((string) ($_POST['pickup_time'] ?? ''));
$order_notes = trim((string) ($_POST['order_notes'] ?? ''));

if ($fulfillment === 'delivery' && $delivery_address === '') {
    header('Location: checkout.php?error=address');
    exit;
}
if ($fulfillment === 'pickup' && $delivery_address === '') {
    $delivery_address = 'In-store pickup';
}

if ($pickup_time === '' || !preg_match('/^\d{2}:\d{2}/', $pickup_time)) {
    $pickup_time = '12:00:00';
} elseif (preg_match('/^\d{2}:\d{2}$/', $pickup_time)) {
    $pickup_time .= ':00';
}

if ($fulfillment === 'pickup') {
    $barangay = 'Store pickup';
}

/* VALIDATE BARANGAY */
if (!isset($barangayDistances[$barangay])) {
    header("Location: checkout.php?error=location");
    exit;
}

/* DISTANCE + RIDER FEE */
$distance_km = (float) $barangayDistances[$barangay];
if ($fulfillment === 'pickup') {
    $distance_km = 0.0;
    $rider_fee = 0.0;
} else {
    $rider_fee = (float) (50 + max(0, ceil($distance_km - 5)) * 15);
}

$delivery_option = (string) ($_POST['delivery_option'] ?? 'standard');
if (!in_array($delivery_option, ['standard', 'priority', 'scheduled'], true)) {
    $delivery_option = 'standard';
}

if ($fulfillment !== 'pickup' && $delivery_option === 'priority') {
    $rider_fee += 30;
}

/* CALCULATE FOOD TOTAL */
$food_total = 0;
foreach ($_SESSION['cart'] as $item) {
    $food_total += $item['price'] * $item['qty'];
}

$total = $food_total + $rider_fee;

$payment_raw = (string) ($_POST['payment_method'] ?? 'cod');
if (!in_array($payment_raw, ['cod', 'gcash', 'bank', 'card'], true)) {
    $payment_raw = 'cod';
}

$payment_method = $payment_raw;
$gcash_ref = trim((string) ($_POST['gcash_ref'] ?? ''));

if ($payment_raw === 'bank') {
    $payment_method = 'cod';
    $delivery_address .= "\n\nPreferred payment: Bank transfer";
} elseif ($payment_raw === 'card') {
    $payment_method = 'cod';
    $delivery_address .= "\n\nPreferred payment: Credit / debit card";
}

if ($order_notes !== '') {
    $delivery_address .= "\n\nCustomer notes: " . $order_notes;
}

if ($fulfillment === 'pickup') {
    $delivery_address = trim($delivery_address . "\n\nFulfillment: Store pickup");
} elseif ($delivery_option === 'priority') {
    $delivery_address .= "\n\nDelivery option: Priority (+₱30 rider fee)";
} elseif ($delivery_option === 'scheduled') {
    $schedule_date = trim((string) ($_POST['schedule_date'] ?? ''));
    $schedule_time = trim((string) ($_POST['schedule_time'] ?? ''));
    if ($schedule_date === '' || $schedule_time === '') {
        header('Location: checkout.php?error=schedule');
        exit;
    }
    $scheduledAt = DateTime::createFromFormat('Y-m-d H:i', $schedule_date . ' ' . substr($schedule_time, 0, 5));
    if (!$scheduledAt) {
        header('Location: checkout.php?error=schedule');
        exit;
    }
    $delivery_address .= "\n\nScheduled delivery: " . $schedule_date . ' at ' . substr($schedule_time, 0, 5);
    if (preg_match('/^\d{2}:\d{2}$/', $schedule_time)) {
        $pickup_time = $schedule_time . ':00';
    }
}

/* PAYMENT STATUS */
if ($payment_method === 'gcash' && $gcash_ref !== '') {
    $payment_status = 'paid';
} else {
    $payment_status = 'pending';
}

/* INSERT ORDER */
$stmt = $pdo->prepare("
    INSERT INTO orders (
        user_id,
        shop_id,
        total,
        payment_method,
        payment_status,
        gcash_ref,
        order_status,
        barangay,
        delivery_address,
        distance_km,
        rider_fee,
        pickup_time
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
");

$stmt->execute([
    $user_id,
    $shop_id,
    $total,
    $payment_method,
    $payment_status,
    $gcash_ref !== '' ? $gcash_ref : null,
    $barangay,
    $delivery_address,
    $distance_km,
    $rider_fee,
    $pickup_time
]);

$order_id = (int) $pdo->lastInsertId();

try {
    $pdo->prepare("UPDATE orders SET order_channel = 'website', kitchen_status = 'new' WHERE id = ?")
        ->execute([$order_id]);
} catch (PDOException $e) {
    // columns may not exist yet
}

/* Auto-assign delivery orders to an available rider */
if ($fulfillment !== 'pickup') {
    kk_auto_assign_rider($pdo, $order_id, (int) $shop_id, $barangay, $delivery_address);
}

/* INSERT ORDER ITEMS */
$itemStmt = $pdo->prepare("
    INSERT INTO order_items (order_id, menu_id, quantity, price)
    VALUES (?, ?, ?, ?)
");

foreach ($_SESSION['cart'] as $item) {
    $itemStmt->execute([
        $order_id,
        $item['menu_id'],
        $item['qty'],
        $item['price']
    ]);
}

/* CLEAR CART */
unset($_SESSION['cart'], $_SESSION['cart_shop_id'], $_SESSION['checkout_prefill']);

/* REDIRECT */
header("Location: order-success.php?id=$order_id");
exit;
