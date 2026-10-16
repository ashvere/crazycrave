(function () {
  document.querySelectorAll('[data-menu-carousel]').forEach(function (root) {
    var track = root.querySelector('.menu-carousel__track');
    var prev = root.querySelector('.menu-carousel__nav--prev');
    var next = root.querySelector('.menu-carousel__nav--next');
    if (!track || !prev || !next) return;

    function itemLeft(item) {
      return item.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    }

    function nearestIndex() {
      var items = track.children;
      var n = items.length;
      if (!n) return 0;
      var sl = track.scrollLeft;
      var maxSl = Math.max(0, track.scrollWidth - track.clientWidth - 1);
      if (sl <= 4) return 0;
      if (sl >= maxSl - 4) return n - 1;
      var best = 0;
      var bestD = Infinity;
      for (var i = 0; i < n; i++) {
        var d = Math.abs(itemLeft(items[i]) - sl);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    }

    function maxScroll() {
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }

    function logicalIndex() {
      var n = track.children.length;
      if (maxScroll() < 40) {
        var s = root.getAttribute('data-kk-slide');
        if (s !== null && s !== '') {
          var v = parseInt(s, 10);
          if (!isNaN(v) && v >= 0 && v < n) return v;
        }
        return 0;
      }
      return nearestIndex();
    }

    function rememberSlide(i) {
      if (maxScroll() < 40) {
        root.setAttribute('data-kk-slide', String(i));
      }
    }

    track.addEventListener(
      'scroll',
      function () {
        if (maxScroll() >= 40) {
          root.removeAttribute('data-kk-slide');
        }
      },
      { passive: true }
    );

    function scrollToIndex(i, instant) {
      var items = track.children;
      var n = items.length;
      if (!n || i < 0 || i >= n) return;
      var pad = 8;
      var x = Math.max(0, itemLeft(items[i]) - pad);
      if (instant) {
        var prevSnap = track.style.scrollSnapType;
        track.style.scrollSnapType = 'none';
        track.scrollLeft = x;
        requestAnimationFrame(function () {
          track.style.scrollSnapType = prevSnap;
        });
      } else {
        track.scrollTo({ left: x, behavior: 'smooth' });
      }
      rememberSlide(i);
    }

    next.addEventListener('click', function () {
      var n = track.children.length;
      if (n < 2) return;
      var cur = logicalIndex();
      var nxt = (cur + 1) % n;
      scrollToIndex(nxt, cur === n - 1 && nxt === 0);
    });

    prev.addEventListener('click', function () {
      var n = track.children.length;
      if (n < 2) return;
      var cur = logicalIndex();
      var prv = (cur - 1 + n) % n;
      scrollToIndex(prv, cur === 0 && prv === n - 1);
    });

    track.scrollLeft = 0;
  });
})();

(function () {
  function boot() {
    var modalEl = document.getElementById('kkHomeMenuModal');
    if (!modalEl || typeof bootstrap === 'undefined') return;

    var imgBase = modalEl.getAttribute('data-img-base') || '';
    var restaurantHref = modalEl.getAttribute('data-restaurant-href') || '';

    var step1 = document.getElementById('kkHomeMenuStep1');
    var step2 = document.getElementById('kkHomeMenuStep2');
    var btnContinue = document.getElementById('kkHomeMenuBtnContinue');
    var btnBack = document.getElementById('kkHomeMenuBtnBack');
    var btnSubmit = document.getElementById('kkHomeMenuBtnSubmit');
    var formAdd = document.getElementById('kkHomeMenuAddForm');
    var street = document.getElementById('kkOrderStreet');
    var streetLabel = document.getElementById('kkOrderStreetLabel');
    var orderTime = document.getElementById('kkOrderTime');
    var orderNotes = document.getElementById('kkOrderNotes');
    var miniBody = document.getElementById('kkMiniCartBody');
    var bInp = document.getElementById('kkModalBarangay');
    var sug = document.getElementById('kkModalSuggestions');
    var jsonEl = document.getElementById('kk-home-barangay-data');

    var kkBarangayMap = {};
    if (jsonEl) {
      try {
        kkBarangayMap = JSON.parse(jsonEl.textContent || '{}') || {};
      } catch (err2) {
        kkBarangayMap = {};
      }
    }

    function encMenuImagePath(rel) {
      if (!rel) return '';
      return rel.split('/').map(function (p) {
        return encodeURIComponent(p);
      }).join('/');
    }

    function escapeHtml(s) {
      var d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    function kkMenuFoodPrice() {
      return parseFloat(modalEl.getAttribute('data-kk-item-price') || '0', 10) || 0;
    }

    var KK_PRIORITY_SURCHARGE = 30;

    function kkDeliverySurcharge() {
      var pic = document.getElementById('kkOrderFulPickup');
      if (pic && pic.checked) return 0;
      var pr = document.getElementById('kkDelPriority');
      return pr && pr.checked ? KK_PRIORITY_SURCHARGE : 0;
    }

    function kkMenuRefreshTotals() {
      var food = kkMenuFoodPrice();
      var pic = document.getElementById('kkOrderFulPickup');
      var pickup = pic && pic.checked;
      var rider = 0;
      if (!pickup) {
        var kmS = modalEl.getAttribute('data-kk-sel-km');
        if (kmS !== null && kmS !== '') {
          var km = parseFloat(kmS, 10);
          if (!isNaN(km)) rider = (50 + Math.max(0, Math.ceil(km - 5)) * 15) + kkDeliverySurcharge();
        }
      }
      var tot = food + rider;
      var elF = document.getElementById('kkMiniFoodTotal');
      var elR = document.getElementById('kkMiniRiderFee');
      var elG = document.getElementById('kkMiniGrandTotal');
      if (elF) elF.textContent = food.toFixed(2);
      if (elR) elR.textContent = rider.toFixed(2);
      if (elG) elG.textContent = tot.toFixed(2);
    }

    function kkMenuFillMiniCart(name, priceStr) {
      if (!miniBody) return;
      var price = parseFloat(priceStr || '0', 10) || 0;
      var row = document.createElement('tr');
      row.innerHTML =
        '<td>' +
        escapeHtml(name) +
        '</td><td class="text-end">1</td><td class="text-end">₱' +
        price.toFixed(2) +
        '</td>';
      miniBody.innerHTML = '';
      miniBody.appendChild(row);
    }

    function kkMenuWireBarangay() {
      if (!bInp || !sug) return;
      bInp.addEventListener('input', function () {
        if (bInp.readOnly) return;
        sug.innerHTML = '';
        var q = bInp.value.toLowerCase();
        if (!q) return;
        Object.keys(kkBarangayMap)
          .filter(function (b) {
            return b.toLowerCase().indexOf(q) >= 0;
          })
          .forEach(function (b) {
            var a = document.createElement('a');
            a.href = '#';
            a.className = 'list-group-item list-group-item-action';
            a.textContent = b + ' (' + kkBarangayMap[b] + ' km)';
            a.addEventListener('click', function (ev) {
              ev.preventDefault();
              bInp.value = b;
              modalEl.setAttribute('data-kk-sel-km', String(kkBarangayMap[b]));
              sug.innerHTML = '';
              kkMenuRefreshTotals();
            });
            sug.appendChild(a);
          });
      });
    }

    kkMenuWireBarangay();

    document.addEventListener('click', function (e) {
      if (bInp && sug && !bInp.contains(e.target) && !sug.contains(e.target)) {
        sug.innerHTML = '';
      }
    });

    function kkMenuFulfillmentListeners() {
      var del = document.getElementById('kkOrderFulDelivery');
      var pic = document.getElementById('kkOrderFulPickup');
      if (!del || !pic || !street || !streetLabel) return;
      function sync() {
        var pickup = pic.checked;
        if (pickup) {
          if (bInp) {
            bInp.value = 'Store pickup';
            bInp.readOnly = true;
          }
          modalEl.setAttribute('data-kk-sel-km', '0');
          streetLabel.textContent = 'Pick-up notes (optional)';
          street.placeholder = 'Name for the counter, car color… (optional)';
          street.required = false;
        } else {
          if (bInp) {
            bInp.readOnly = false;
            if (bInp.value === 'Store pickup') bInp.value = '';
            modalEl.removeAttribute('data-kk-sel-km');
          }
          streetLabel.textContent = 'Street / landmark';
          street.placeholder = 'House number, street, landmark…';
          street.required = true;
        }
        if (sug) sug.innerHTML = '';
        kkMenuRefreshTotals();
      }
      del.addEventListener('change', sync);
      pic.addEventListener('change', sync);
      sync();
    }

    kkMenuFulfillmentListeners();

    function kkToggleModalScheduled() {
      var sched = document.getElementById('kkDelScheduled');
      var fields = document.getElementById('kkModalScheduledFields');
      if (!sched || !fields) return;
      fields.classList.toggle('d-none', !sched.checked);
    }

    function kkMenuWireDeliveryPayment() {
      document.querySelectorAll('#kkHomeMenuStep2 .payment-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          var radio = opt.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
          document.querySelectorAll('#kkHomeMenuStep2 .payment-option').forEach(function (o) {
            o.classList.remove('active');
          });
          opt.classList.add('active');
        });
      });
      document.querySelectorAll('#kkHomeMenuStep2 .delivery-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          var radio = opt.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
          document.querySelectorAll('#kkHomeMenuStep2 .delivery-option').forEach(function (o) {
            o.classList.remove('active');
          });
          opt.classList.add('active');
          kkToggleModalScheduled();
          kkMenuRefreshTotals();
        });
      });
      ['kkDelStandard', 'kkDelPriority', 'kkDelScheduled'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el)
          el.addEventListener('change', function () {
            kkToggleModalScheduled();
            kkMenuRefreshTotals();
          });
      });
      kkToggleModalScheduled();
    }

    kkMenuWireDeliveryPayment();

    function kkMenuGoStep(n) {
      var mode = modalEl.getAttribute('data-kk-mode') || 'cart';
      if (!step1 || !step2) return;
      if (n === 2 && mode !== 'details') return;
      var step1Actions = document.getElementById('kkHomeMenuStep1Actions');
      if (n === 1) {
        step1.classList.remove('d-none');
        step2.classList.add('d-none');
        if (mode === 'details') {
          if (btnContinue) btnContinue.classList.add('d-none');
          if (btnBack) btnBack.classList.add('d-none');
          if (btnSubmit) btnSubmit.classList.add('d-none');
          if (step1Actions) step1Actions.classList.remove('d-none');
        } else {
          if (btnContinue) btnContinue.classList.add('d-none');
          if (btnBack) btnBack.classList.add('d-none');
          if (btnSubmit) btnSubmit.classList.remove('d-none');
          if (step1Actions) step1Actions.classList.add('d-none');
        }
      } else {
        step1.classList.add('d-none');
        step2.classList.remove('d-none');
        if (btnContinue) btnContinue.classList.add('d-none');
        if (btnBack) btnBack.classList.remove('d-none');
        if (btnSubmit) btnSubmit.classList.remove('d-none');
        if (step1Actions) step1Actions.classList.add('d-none');
      }
    }

    var step1Order = document.getElementById('kkHomeMenuStep1Order');
    var step1Add = document.getElementById('kkHomeMenuStep1Add');
    if (step1Order) {
      step1Order.addEventListener('click', function () {
        kkMenuGoStep(2);
      });
    }
    if (step1Add) {
      step1Add.addEventListener('click', function () {
        modalEl.setAttribute('data-kk-mode', 'cart');
        kkMenuGoStep(1);
        if (formAdd) {
          if (typeof formAdd.requestSubmit === 'function') {
            formAdd.requestSubmit();
          } else {
            formAdd.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
        }
      });
    }

    if (btnContinue) {
      btnContinue.addEventListener('click', function () {
        kkMenuGoStep(2);
      });
    }
    if (btnBack) {
      btnBack.addEventListener('click', function () {
        kkMenuGoStep(1);
      });
    }

    function kkKmFromBarangayField() {
      if (!bInp) return NaN;
      var v = bInp.value;
      if (Object.prototype.hasOwnProperty.call(kkBarangayMap, v)) {
        return parseFloat(kkBarangayMap[v], 10);
      }
      return NaN;
    }

    function kkMenuCopyPrefillToHidden() {
      var flowEl = document.getElementById('kkPrefillFlow');
      var fulEl = document.getElementById('kkPrefillFulfillment');
      var addrEl = document.getElementById('kkPrefillAddress');
      var timeEl = document.getElementById('kkPrefillTime');
      var payEl = document.getElementById('kkPrefillPayment');
      var notesEl = document.getElementById('kkPrefillNotes');
      var brEl = document.getElementById('kkPrefillBarangay');
      var dOptEl = document.getElementById('kkPrefillDeliveryOption');
      var dKmEl = document.getElementById('kkPrefillDistanceKm');
      var rFeeEl = document.getElementById('kkPrefillRiderFee');
      var schedDateEl = document.getElementById('kkPrefillScheduleDate');
      var schedTimeEl = document.getElementById('kkPrefillScheduleTime');
      var kkSchedDate = document.getElementById('kkScheduleDate');
      var kkSchedTime = document.getElementById('kkScheduleTime');
      var mode = modalEl.getAttribute('data-kk-mode') || 'cart';
      if (flowEl) flowEl.value = mode === 'details' ? 'order_now' : '';
      var ful = document.querySelector('input[name="kk_order_fulfillment"]:checked');
      if (fulEl) fulEl.value = ful ? ful.value : 'delivery';
      if (addrEl && street) addrEl.value = street.value.trim();
      if (timeEl && orderTime) timeEl.value = orderTime.value || '12:00';
      var pay = document.querySelector('#kkHomeMenuStep2 input[name="kk_order_payment"]:checked');
      if (payEl) payEl.value = pay ? pay.value : 'cod';
      if (notesEl && orderNotes) notesEl.value = orderNotes.value.trim();

      var delOpt = document.querySelector('input[name="kk_delivery_option"]:checked');
      if (dOptEl) dOptEl.value = delOpt ? delOpt.value : 'standard';

      var pic = document.getElementById('kkOrderFulPickup');
      if (pic && pic.checked) {
        if (brEl) brEl.value = 'Store pickup';
        if (dKmEl) dKmEl.value = '0';
        if (rFeeEl) rFeeEl.value = '0';
      } else {
        if (brEl && bInp) brEl.value = bInp.value.trim();
        var kmS = modalEl.getAttribute('data-kk-sel-km');
        var km = NaN;
        if (kmS !== null && kmS !== '') km = parseFloat(kmS, 10);
        if (isNaN(km)) km = kkKmFromBarangayField();
        if (!isNaN(km)) {
          var rider = (50 + Math.max(0, Math.ceil(km - 5)) * 15) + kkDeliverySurcharge();
          if (dKmEl) dKmEl.value = String(km);
          if (rFeeEl) rFeeEl.value = String(rider);
        } else {
          if (dKmEl) dKmEl.value = '';
          if (rFeeEl) rFeeEl.value = '';
        }
      }
      if (schedDateEl && kkSchedDate) schedDateEl.value = kkSchedDate.value;
      if (schedTimeEl && kkSchedTime) schedTimeEl.value = kkSchedTime.value;
    }

    if (formAdd) {
      formAdd.addEventListener('submit', function (e) {
        var mode = modalEl.getAttribute('data-kk-mode') || 'cart';
        if (mode === 'details') {
          var s2 = document.getElementById('kkHomeMenuStep2');
          if (s2 && s2.classList.contains('d-none')) {
            e.preventDefault();
            return;
          }
          var del = document.getElementById('kkOrderFulDelivery');
          var pic = document.getElementById('kkOrderFulPickup');
          var pickup = pic && pic.checked;
          if (del && del.checked) {
            if (street && !street.value.trim()) {
              e.preventDefault();
              window.alert('Please enter a delivery street / landmark.');
              return;
            }
            if (bInp) {
              var br = bInp.value.trim();
              if (!Object.prototype.hasOwnProperty.call(kkBarangayMap, br)) {
                e.preventDefault();
                window.alert('Please choose a valid barangay from the suggestions list.');
                return;
              }
            }
          }
          var sched = document.getElementById('kkDelScheduled');
          if (sched && sched.checked) {
            var sd = document.getElementById('kkScheduleDate');
            var st = document.getElementById('kkScheduleTime');
            if (!sd || !sd.value || !st || !st.value) {
              e.preventDefault();
              window.alert('Please choose a delivery date and time for scheduled delivery.');
              return;
            }
          }
        }
        kkMenuCopyPrefillToHidden();
      });
    }

    modalEl.addEventListener('hidden.bs.modal', function () {
      kkMenuGoStep(1);
    });

    modalEl.addEventListener('show.bs.modal', function (e) {
      var btn = e.relatedTarget;
      if (!btn || !btn.getAttribute('data-kk-menu-id')) return;

      var shopId = btn.getAttribute('data-kk-shop-id') || '';
      var menuId = btn.getAttribute('data-kk-menu-id') || '';
      var name = btn.getAttribute('data-kk-name') || '';
      var price = btn.getAttribute('data-kk-price') || '0';
      var image = btn.getAttribute('data-kk-image') || '';
      var description = btn.getAttribute('data-kk-description') || '';
      var shopName = btn.getAttribute('data-kk-shop-name') || '';
      var mode = btn.getAttribute('data-kk-open') || 'cart';
      modalEl.setAttribute('data-kk-mode', mode);
      modalEl.setAttribute('data-kk-item-price', price);
      modalEl.removeAttribute('data-kk-sel-km');

      var titleEl = document.getElementById('kkHomeMenuModalLabel');
      var shopLine = document.getElementById('kkHomeMenuShopLine');
      var priceLine = document.getElementById('kkHomeMenuPriceLine');
      var img = document.getElementById('kkHomeMenuImg');
      var descEl = document.getElementById('kkHomeMenuDesc');
      var wrap = document.getElementById('kkHomeMenuDetailsWrap');
      var showDetails = document.getElementById('kkHomeMenuShowDetails');
      var shopLink = document.getElementById('kkHomeMenuShopLink');

      if (titleEl) titleEl.textContent = name;
      if (shopLine) shopLine.textContent = shopName ? 'From ' + shopName : '';
      var num = parseFloat(price, 10);
      if (priceLine) priceLine.textContent = isNaN(num) ? '' : '₱' + num.toFixed(2);
      if (img) {
        img.src = /^https?:\/\//i.test(image || '') ? image : imgBase + encMenuImagePath(image);
        img.alt = name;
      }
      if (descEl) {
        descEl.textContent = description.trim()
          ? description
          : 'More about this dish is on the full shop menu.';
      }

      if (wrap && showDetails) {
        if (mode === 'details') {
          wrap.classList.remove('d-none');
          showDetails.classList.add('d-none');
        } else {
          wrap.classList.add('d-none');
          if (description.trim()) {
            showDetails.classList.remove('d-none');
          } else {
            showDetails.classList.add('d-none');
          }
        }
        showDetails.onclick = function () {
          wrap.classList.remove('d-none');
          showDetails.classList.add('d-none');
        };
      }

      var mid = document.getElementById('kkHomeMenuInputMenuId');
      var sid = document.getElementById('kkHomeMenuInputShopId');
      if (mid) mid.value = menuId;
      if (sid) sid.value = shopId;
      if (shopLink && restaurantHref) {
        var sep = restaurantHref.indexOf('?') >= 0 ? '&' : '?';
        shopLink.href = restaurantHref + sep + 'id=' + encodeURIComponent(shopId);
      }

      kkMenuFillMiniCart(name, price);

      var fd = document.getElementById('kkOrderFulDelivery');
      var fp = document.getElementById('kkOrderFulPickup');
      if (fd) fd.checked = true;
      if (fp) fp.checked = false;
      var pc = document.getElementById('kkPayCod');
      if (pc) pc.checked = true;
      var st = document.getElementById('kkDelStandard');
      if (st) st.checked = true;
      if (street) street.value = '';
      if (orderTime) orderTime.value = '12:00';
      if (orderNotes) orderNotes.value = '';
      if (bInp) {
        bInp.value = '';
        bInp.readOnly = false;
      }
      if (sug) sug.innerHTML = '';
      if (fd) fd.dispatchEvent(new Event('change'));

      kkMenuGoStep(1);
    });

    var sd = document.getElementById('kkScheduleDate');
    if (sd) sd.min = new Date().toISOString().slice(0, 10);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
