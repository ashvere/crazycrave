<?php
session_start();

/* REQUIRE LOGIN */
if (!isset($_SESSION['user'])) {
    header("Location: login.php?redirect=checkout");
    exit;
}

/* CART CHECK */
if (empty($_SESSION['cart'])) {
    header("Location: cart.php");
    exit;
}

$checkoutPrefill = $_SESSION['checkout_prefill'] ?? null;

require_once __DIR__ . '/db/database.php';
require_once __DIR__ . '/app/customer_profile.php';

include 'views/header.php';

$cart = $_SESSION['cart'];
$grandTotal = 0;

foreach ($cart as $item) {
    $grandTotal += $item['price'] * $item['qty'];
}

$barangayDistances = require __DIR__ . '/data/barangay_pototan.php';

$pf = is_array($checkoutPrefill) ? $checkoutPrefill : [];
$initFul = (($pf['fulfillment'] ?? '') === 'pickup') ? 'pickup' : 'delivery';
$initBarangay = $initFul === 'pickup'
    ? 'Store pickup'
    : trim((string) ($pf['barangay'] ?? ''));
$initAddress = trim((string) ($pf['address'] ?? ''));
$rawTime = (string) ($pf['time'] ?? '');
$initTime = preg_match('/^\d{2}:\d{2}/', $rawTime) ? substr($rawTime, 0, 5) : '12:00';
$profilePay = null;
if (empty($pf['payment']) && isset($_SESSION['user']['id'])) {
    $custProfile = kk_customer_profile_get($pdo, (int) $_SESSION['user']['id']);
    $profilePay = $custProfile['preferred_payment'] ?? null;
}
$initPay = in_array($pf['payment'] ?? $profilePay ?? 'cod', ['cod', 'gcash', 'bank', 'card'], true)
    ? ($pf['payment'] ?? $profilePay ?? 'cod')
    : 'cod';
$initNotes = trim((string) ($pf['notes'] ?? ''));
$initDeliveryOption = in_array($pf['delivery_option'] ?? 'standard', ['standard', 'priority', 'scheduled'], true)
    ? ($pf['delivery_option'] ?? 'standard')
    : 'standard';
$initScheduledDate = trim((string) ($pf['schedule_date'] ?? ''));
$initScheduledTime = trim((string) ($pf['schedule_time'] ?? ''));
if ($initScheduledDate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $initScheduledDate)) {
    $initScheduledDate = date('Y-m-d');
}
if ($initScheduledTime === '' || !preg_match('/^\d{2}:\d{2}/', $initScheduledTime)) {
    $initScheduledTime = '12:00';
} else {
    $initScheduledTime = substr($initScheduledTime, 0, 5);
}

$kkPrioritySurcharge = 30;
$initDistanceKm = '';
$initRiderFee = '';
if ($initFul === 'pickup') {
    $initDistanceKm = '0';
    $initRiderFee = '0';
} elseif ($initBarangay !== '' && isset($barangayDistances[$initBarangay])) {
    $dKm = (float) $barangayDistances[$initBarangay];
    $initDistanceKm = (string) $dKm;
    $baseRider = (float) (50 + max(0, ceil($dKm - 5)) * 15);
    if ($initDeliveryOption === 'priority') {
        $baseRider += $kkPrioritySurcharge;
    }
    $initRiderFee = (string) $baseRider;
} elseif (($pf['distance_km'] ?? '') !== '') {
    $dKm = (float) $pf['distance_km'];
    $initDistanceKm = trim((string) $pf['distance_km']);
    $baseRider = (float) (50 + max(0, ceil($dKm - 5)) * 15);
    if ($initDeliveryOption === 'priority') {
        $baseRider += $kkPrioritySurcharge;
    }
    $initRiderFee = (string) $baseRider;
}

$checkoutInitialRider = $initFul === 'pickup' ? 0.0 : (is_numeric($initRiderFee) ? (float) $initRiderFee : 0.0);
$checkoutInitialGrand = $grandTotal + $checkoutInitialRider;
?>

<main class="checkout-page">
    <div class="container checkout-page__inner">
        <header class="checkout-page__intro">
            <p class="checkout-page__kicker">Almost there</p>
            <h1 class="checkout-page__title">Checkout</h1>
            <p class="checkout-page__lede">Confirm your order and delivery details.</p>
        </header>

        <div class="checkout-page__layout">
            <aside class="checkout-page__summary" aria-labelledby="checkout-summary-heading">
                <div class="checkout-page__surface">
                    <h2 id="checkout-summary-heading" class="checkout-page__section-title">
                        <i class="bi bi-bag-check" aria-hidden="true"></i>
                        <span>Your order</span>
                    </h2>

                    <div class="table-responsive checkout-page__scroll">
                        <table class="table table-hover checkout-page-table align-middle mb-0">
                            <thead>
                                <tr>
                                    <th scope="col">Item</th>
                                    <th scope="col" class="text-end">Qty</th>
                                    <th scope="col" class="text-end">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($cart as $item): ?>
                                    <tr>
                                        <td class="fw-medium"><?= htmlspecialchars((string) $item['name'], ENT_QUOTES, 'UTF-8') ?></td>
                                        <td class="text-end tabular-nums"><?= (int) $item['qty'] ?></td>
                                        <td class="text-end tabular-nums">₱<?= number_format((float) $item['price'] * (int) $item['qty'], 2) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>

                    <div class="checkout-page__totals">
                        <div class="checkout-page__totals-row">
                            <span class="checkout-page__totals-label">Food total</span>
                            <span class="checkout-page__totals-value tabular-nums">₱<span id="foodTotal"><?= number_format($grandTotal, 2) ?></span></span>
                        </div>
                        <div class="checkout-page__totals-row">
                            <span class="checkout-page__totals-label">Rider fee</span>
                            <span class="checkout-page__totals-value tabular-nums">₱<span id="riderFee"><?= number_format($checkoutInitialRider, 2) ?></span></span>
                        </div>
                        <div class="checkout-page__totals-row checkout-page__totals-row--grand">
                            <span class="checkout-page__totals-label">Grand total</span>
                            <span class="checkout-page__totals-value tabular-nums">₱<span id="finalTotal"><?= number_format($checkoutInitialGrand, 2) ?></span></span>
                        </div>
                    </div>
                </div>
            </aside>

            <div class="checkout-page__main">
                <form action="place-order.php" method="POST" id="checkoutForm" class="checkout-page__form">
                    <input type="hidden" name="food_total" value="<?= $grandTotal ?>">
                    <input type="hidden" name="distance_km" id="distance_km" value="<?= htmlspecialchars($initDistanceKm, ENT_QUOTES, 'UTF-8') ?>">
                    <input type="hidden" name="rider_fee" id="rider_fee_input" value="<?= htmlspecialchars($initRiderFee, ENT_QUOTES, 'UTF-8') ?>">
                    <input type="hidden" name="fulfillment" id="checkout_fulfillment" value="<?= htmlspecialchars($initFul, ENT_QUOTES, 'UTF-8') ?>">

                    <?php if (!empty($checkoutPrefill)): ?>
                        <div class="checkout-page__notice" role="status">
                            <i class="bi bi-info-circle" aria-hidden="true"></i>
                            <span>We filled in some fields from your <strong>Order now</strong> step. You can still edit everything below.</span>
                        </div>
                    <?php endif; ?>

                    <section class="checkout-page__surface checkout-page__section" aria-labelledby="checkout-delivery-heading">
                        <h2 id="checkout-delivery-heading" class="checkout-page__section-title">
                            <i class="bi bi-geo-alt" aria-hidden="true"></i>
                            <span>Delivery details</span>
                        </h2>

                        <div class="checkout-page__field position-relative">
                            <label class="checkout-page__label" for="barangay">Barangay (Pototan, Iloilo only)</label>
                            <input
                                type="text"
                                name="barangay"
                                id="barangay"
                                class="form-control checkout-page__control"
                                placeholder="Type your barangay…"
                                autocomplete="off"
                                required
                                value="<?= htmlspecialchars($initBarangay, ENT_QUOTES, 'UTF-8') ?>"
                                <?= $initFul === 'pickup' ? 'readonly' : '' ?>>
                            <div id="suggestions" class="checkout-page__suggestions list-group"></div>
                        </div>

                        <div class="checkout-page__field">
                            <label class="checkout-page__label" for="delivery_address">Street / landmark</label>
                            <textarea
                                name="delivery_address"
                                id="delivery_address"
                                class="form-control checkout-page__control"
                                rows="2"
                                placeholder="House number, street, landmark…"
                                <?= $initFul === 'pickup' ? '' : 'required' ?>><?= htmlspecialchars($initAddress, ENT_QUOTES, 'UTF-8') ?></textarea>
                        </div>

                        <div class="checkout-page__field">
                            <label class="checkout-page__label" for="pickup_time">Preferred pickup / delivery time</label>
                            <input
                                type="time"
                                name="pickup_time"
                                id="pickup_time"
                                class="form-control checkout-page__control"
                                required
                                value="<?= htmlspecialchars($initTime, ENT_QUOTES, 'UTF-8') ?>">
                        </div>

                        <div class="checkout-page__field mb-0">
                            <label class="checkout-page__label" for="order_notes">Order notes</label>
                            <textarea
                                name="order_notes"
                                id="order_notes"
                                class="form-control checkout-page__control"
                                rows="2"
                                placeholder="Optional"><?= htmlspecialchars($initNotes, ENT_QUOTES, 'UTF-8') ?></textarea>
                        </div>
                    </section>

                    <section class="checkout-page__surface checkout-page__section" aria-labelledby="checkout-shipping-heading">
                        <h2 id="checkout-shipping-heading" class="checkout-page__section-title">
                            <i class="bi bi-truck" aria-hidden="true"></i>
                            <span>Delivery options</span>
                        </h2>

                        <div class="delivery-option<?= $initDeliveryOption === 'standard' ? ' active' : '' ?>">
                            <input type="radio" name="delivery_option" value="standard" id="standard" <?= $initDeliveryOption === 'standard' ? 'checked' : '' ?>>
                            <label for="standard">
                                <span class="checkout-option__name">Standard</span>
                                <small class="checkout-option__meta">20 – 35 mins</small>
                            </label>
                        </div>

                        <div class="delivery-option<?= $initDeliveryOption === 'priority' ? ' active' : '' ?>">
                            <input type="radio" name="delivery_option" value="priority" id="priority" <?= $initDeliveryOption === 'priority' ? 'checked' : '' ?>>
                            <label for="priority">
                                <span class="checkout-option__name">Priority</span>
                                <small class="checkout-option__meta">40 – 55 mins · + ₱<?= $kkPrioritySurcharge ?> rider fee</small>
                                <span class="badge rounded-pill bg-success-subtle text-success-emphasis">Available</span>
                            </label>
                        </div>

                        <div class="delivery-option<?= $initDeliveryOption === 'scheduled' ? ' active' : '' ?>">
                            <input type="radio" name="delivery_option" value="scheduled" id="scheduled" <?= $initDeliveryOption === 'scheduled' ? 'checked' : '' ?>>
                            <label for="scheduled">
                                <span class="checkout-option__name">Scheduled</span>
                                <small class="checkout-option__meta">Choose a date &amp; time below</small>
                                <span class="badge rounded-pill bg-success-subtle text-success-emphasis">Available</span>
                            </label>
                        </div>

                        <div class="checkout-page__scheduled mt-3<?= $initDeliveryOption === 'scheduled' ? '' : ' d-none' ?>" id="scheduledFields">
                            <div class="row g-2">
                                <div class="col-sm-6">
                                    <label class="checkout-page__label" for="schedule_date">Delivery date</label>
                                    <input type="date" name="schedule_date" id="schedule_date" class="form-control checkout-page__control" value="<?= htmlspecialchars($initScheduledDate, ENT_QUOTES, 'UTF-8') ?>" min="<?= date('Y-m-d') ?>">
                                </div>
                                <div class="col-sm-6">
                                    <label class="checkout-page__label" for="schedule_time">Delivery time</label>
                                    <input type="time" name="schedule_time" id="schedule_time" class="form-control checkout-page__control" value="<?= htmlspecialchars($initScheduledTime, ENT_QUOTES, 'UTF-8') ?>">
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="checkout-page__surface checkout-page__section" aria-labelledby="checkout-payment-heading">
                        <h2 id="checkout-payment-heading" class="checkout-page__section-title">
                            <i class="bi bi-credit-card" aria-hidden="true"></i>
                            <span>Payment method</span>
                        </h2>

                        <div class="payment-option<?= $initPay === 'cod' ? ' active' : '' ?>">
                            <input type="radio" name="payment_method" value="cod" id="cod" <?= $initPay === 'cod' ? 'checked' : '' ?>>
                            <label for="cod">
                                <span class="checkout-option__name"><i class="bi bi-cash-coin me-1" aria-hidden="true"></i>Cash on delivery</span>
                                <span class="badge rounded-pill bg-success-subtle text-success-emphasis">Available</span>
                            </label>
                        </div>

                        <div class="payment-option<?= $initPay === 'gcash' ? ' active' : '' ?>">
                            <input type="radio" name="payment_method" value="gcash" id="gcash" <?= $initPay === 'gcash' ? 'checked' : '' ?>>
                            <label for="gcash">
                                <span class="checkout-option__name"><i class="bi bi-phone me-1" aria-hidden="true"></i>GCash</span>
                                <span class="badge rounded-pill bg-success-subtle text-success-emphasis">Available</span>
                            </label>
                        </div>

                        <div class="payment-option<?= $initPay === 'bank' ? ' active' : '' ?>">
                            <input type="radio" name="payment_method" value="bank" id="bank" <?= $initPay === 'bank' ? 'checked' : '' ?>>
                            <label for="bank">
                                <span class="checkout-option__name"><i class="bi bi-bank me-1" aria-hidden="true"></i>Bank transfer</span>
                                <span class="badge rounded-pill bg-success-subtle text-success-emphasis">Available</span>
                            </label>
                        </div>

                        <div class="payment-option<?= $initPay === 'card' ? ' active' : '' ?>">
                            <input type="radio" name="payment_method" value="card" id="card" <?= $initPay === 'card' ? 'checked' : '' ?>>
                            <label for="card">
                                <span class="checkout-option__name"><i class="bi bi-credit-card-2-front me-1" aria-hidden="true"></i>Credit / debit card</span>
                                <span class="badge rounded-pill bg-success-subtle text-success-emphasis">Available</span>
                            </label>
                        </div>

                        <div class="checkout-page__field mb-0 mt-2<?= $initPay === 'gcash' ? '' : ' d-none' ?>" id="gcashDetails">
                            <label class="checkout-page__label" for="gcash_ref">GCash reference number</label>
                            <input type="text" name="gcash_ref" id="gcash_ref" class="form-control checkout-page__control" placeholder="Reference after you pay (optional)" autocomplete="off">
                            <p class="small text-muted mt-1 mb-0">Send payment via GCash, then enter your reference here if you have one.</p>
                        </div>
                    </section>

                    <button type="submit" class="btn btn-dark btn-lg w-100 checkout-page__submit rounded-pill fw-semibold">
                        <i class="bi bi-check2-circle me-2" aria-hidden="true"></i>Place order
                    </button>
                </form>
            </div>
        </div>
    </div>
</main>

<script>
const barangayMap = <?= json_encode($barangayDistances) ?>;
const barangayInput = document.getElementById('barangay');
const suggestionsBox = document.getElementById('suggestions');
const riderFeeSpan = document.getElementById('riderFee');
const finalTotalSpan = document.getElementById('finalTotal');
const riderFeeInput = document.getElementById('rider_fee_input');
const distanceInput = document.getElementById('distance_km');
const foodTotal = <?= $grandTotal ?>;
const PRIORITY_SURCHARGE = <?= (int) $kkPrioritySurcharge ?>;

function isPickup() {
    const ful = document.getElementById('checkout_fulfillment');
    return ful && ful.value === 'pickup';
}

function deliverySurcharge() {
    if (isPickup()) return 0;
    const pr = document.getElementById('priority');
    return pr && pr.checked ? PRIORITY_SURCHARGE : 0;
}

function refreshCheckoutTotals() {
    if (isPickup()) {
        riderFeeSpan.textContent = '0.00';
        finalTotalSpan.textContent = foodTotal.toFixed(2);
        riderFeeInput.value = '0';
        return;
    }
    let km = parseFloat(distanceInput.value, 10);
    if (isNaN(km) && barangayInput && Object.prototype.hasOwnProperty.call(barangayMap, barangayInput.value)) {
        km = parseFloat(barangayMap[barangayInput.value], 10);
    }
    if (isNaN(km)) return;
    const rider = (50 + Math.max(0, Math.ceil(km - 5)) * 15) + deliverySurcharge();
    distanceInput.value = km;
    riderFeeInput.value = String(rider);
    riderFeeSpan.textContent = rider.toFixed(2);
    finalTotalSpan.textContent = (foodTotal + rider).toFixed(2);
}

if (barangayInput) {
    barangayInput.addEventListener('input', () => {
        const query = barangayInput.value.toLowerCase();
        suggestionsBox.innerHTML = '';

        if (!query) return;

        const matches = Object.keys(barangayMap).filter(b => b.toLowerCase().includes(query));

        matches.forEach(b => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action';
            item.textContent = `${b} (${barangayMap[b]} km)`;
            item.addEventListener('click', (e) => {
                e.preventDefault();
                barangayInput.value = b;
                distanceInput.value = barangayMap[b];
                suggestionsBox.innerHTML = '';
                refreshCheckoutTotals();
            });
            suggestionsBox.appendChild(item);
        });
    });
}

document.addEventListener('click', (e) => {
    if (barangayInput && suggestionsBox && !barangayInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.innerHTML = '';
    }
});

document.getElementById('checkoutForm').addEventListener('submit', (e) => {
    if (!isPickup()) {
        if (!distanceInput.value || !riderFeeInput.value) {
            alert('Please select a valid barangay to calculate the rider fee.');
            e.preventDefault();
            return;
        }
    }
    const sched = document.getElementById('scheduled');
    if (sched && sched.checked) {
        const d = document.getElementById('schedule_date');
        const t = document.getElementById('schedule_time');
        if (!d || !d.value || !t || !t.value) {
            alert('Please choose a delivery date and time for scheduled delivery.');
            e.preventDefault();
        }
    }
});

function toggleGcashDetails() {
    const gcashRadio = document.getElementById('gcash');
    const gcashDetails = document.getElementById('gcashDetails');
    if (!gcashRadio || !gcashDetails) return;
    gcashDetails.classList.toggle('d-none', !gcashRadio.checked);
}

['cod', 'gcash', 'bank', 'card'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', toggleGcashDetails);
});
toggleGcashDetails();

function toggleScheduledFields() {
    const sched = document.getElementById('scheduled');
    const fields = document.getElementById('scheduledFields');
    if (!sched || !fields) return;
    fields.classList.toggle('d-none', !sched.checked);
}

['standard', 'priority', 'scheduled'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', function () {
        toggleScheduledFields();
        refreshCheckoutTotals();
    });
});
toggleScheduledFields();
refreshCheckoutTotals();

document.querySelectorAll('.checkout-page .payment-option').forEach(option => {
    option.addEventListener('click', () => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        document.querySelectorAll('.checkout-page .payment-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        toggleGcashDetails();
    });
});

document.querySelectorAll('.checkout-page .delivery-option').forEach(option => {
    option.addEventListener('click', () => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        document.querySelectorAll('.checkout-page .delivery-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        toggleScheduledFields();
        refreshCheckoutTotals();
    });
});
</script>

<?php include 'views/footer.php'; ?>
