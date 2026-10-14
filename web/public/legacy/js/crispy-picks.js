(function () {
    'use strict';

    var configEl = document.getElementById('kkCrispyPicksConfig');
    var root = document.getElementById('crispyPicks');
    if (!configEl || !root) {
        return;
    }

    var cfg;
    try {
        cfg = JSON.parse(configEl.textContent || '{}');
    } catch (e) {
        return;
    }

    var catalog = cfg.catalog || [];
    if (!catalog.length) {
        root.hidden = true;
        return;
    }

    var contextEl = document.getElementById('crispyPicksContext');
    var gridEl = document.getElementById('crispyPicksGrid');
    var noteEl = document.getElementById('crispyPicksNote');
    var imgBase = cfg.imgBase || '';
    var restaurantUrl = cfg.restaurantUrl || 'restaurant.php';

    var state = {
        lat: cfg.defaultLat || 10.7813,
        lon: cfg.defaultLon || 122.634,
        placeLabel: cfg.defaultPlace || 'your area',
        weatherCode: null,
        temperature: null,
        weatherKind: 'cloudy',
        weatherLabel: 'Checking weather…',
        weatherTags: [],
    };

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function encodePath(path) {
        return String(path || '')
            .split('/')
            .map(function (part) {
                return encodeURIComponent(part);
            })
            .join('/');
    }

    function menuHref(shopId) {
        var sep = restaurantUrl.indexOf('?') >= 0 ? '&' : '?';
        return restaurantUrl + sep + 'id=' + encodeURIComponent(shopId) + '#menu';
    }

    /**
     * @returns {{ kind: string, label: string, tags: string[] }}
     */
    function classifyWeather(code, tempC) {
        var rainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
        var storm = [95, 96, 99];
        var sunnyCodes = [0, 1];
        var cloudyCodes = [2, 3, 45, 48];
        var c = typeof code === 'number' ? code : -1;
        var t = typeof tempC === 'number' ? tempC : 28;

        if (storm.indexOf(c) >= 0) {
            return {
                kind: 'stormy',
                label: 'Stormy weather',
                tags: ['warm', 'comfort', 'soup', 'rice', 'pares'],
            };
        }
        if (rainy.indexOf(c) >= 0) {
            return {
                kind: 'rainy',
                label: 'Rainy weather',
                tags: ['warm', 'comfort', 'soup', 'rice', 'pares'],
            };
        }
        if (t >= 32) {
            return {
                kind: 'hot',
                label: 'Hot & sunny',
                tags: ['chicken', 'fried', 'crispy', 'light', 'snack'],
            };
        }
        if (sunnyCodes.indexOf(c) >= 0 || (t >= 27 && cloudyCodes.indexOf(c) < 0)) {
            return {
                kind: 'sunny',
                label: 'Sunny weather',
                tags: ['chicken', 'fried', 'crispy', 'snack', 'street'],
            };
        }
        if (cloudyCodes.indexOf(c) >= 0) {
            return {
                kind: 'cloudy',
                label: 'Cloudy weather',
                tags: ['comfort', 'dimsum', 'snack', 'rice'],
            };
        }
        return {
            kind: 'cloudy',
            label: 'Mild weather',
            tags: ['comfort', 'dimsum', 'snack', 'chicken'],
        };
    }

    function scoreItem(item, tags) {
        var score = 0;
        var itemTags = item.tags || [];
        tags.forEach(function (tag) {
            if (itemTags.indexOf(tag) >= 0) {
                score += 2;
            }
        });

        if (state.weatherKind === 'rainy' || state.weatherKind === 'stormy') {
            if (itemTags.indexOf('pares') >= 0) score += 4;
            if (itemTags.indexOf('warm') >= 0) score += 2;
            if (itemTags.indexOf('rice') >= 0) score += 1;
        }
        if (state.weatherKind === 'sunny' || state.weatherKind === 'hot') {
            if (itemTags.indexOf('fried') >= 0) score += 3;
            if (itemTags.indexOf('chicken') >= 0) score += 2;
            if (itemTags.indexOf('snack') >= 0) score += 1;
        }
        if (state.weatherKind === 'cloudy') {
            if (itemTags.indexOf('dimsum') >= 0) score += 2;
            if (itemTags.indexOf('comfort') >= 0) score += 1;
        }

        return score;
    }

    // Rotated by card position so four picks never repeat the same sentence.
    var SNACK_LINES = [
        function (n) { return n + ' is a light, savory bite, just right for a cloudy afternoon.'; },
        function (n) { return 'Craving something warm but not heavy? ' + n + ' hits the spot on an overcast day.'; },
        function (n) { return 'A classic merienda — grab a few pieces of ' + n + ' while the skies stay gray.'; },
        function (n) { return n + ' is easy to share and quick to enjoy whatever the weather brings.'; },
    ];

    function weatherBlurb(item, idx) {
        idx = idx || 0;
        var itemTags = item.tags || [];
        var name = item.name;
        var kind = state.weatherKind;

        if ((kind === 'rainy' || kind === 'stormy') && itemTags.indexOf('pares') >= 0) {
            return 'Beef pares with savory broth is a comforting choice when it\'s wet outside — warm, filling, and easy to enjoy at home.';
        }
        if ((kind === 'rainy' || kind === 'stormy') && itemTags.indexOf('warm') >= 0) {
            return 'A hot, hearty dish like ' + name + ' helps you stay cozy while the rain comes down.';
        }
        if ((kind === 'rainy' || kind === 'stormy') && itemTags.indexOf('rice') >= 0) {
            return 'Rice meals like ' + name + ' are satisfying on rainy days when you want something warm and substantial.';
        }
        if ((kind === 'sunny' || kind === 'hot') && itemTags.indexOf('chicken') >= 0) {
            return 'Crispy fried chicken is a go-to on sunny days — golden, crunchy, and perfect for a bright afternoon meal.';
        }
        if ((kind === 'sunny' || kind === 'hot') && itemTags.indexOf('fried') >= 0) {
            return name + ' is great when the sun is out: crisp, flavorful, and easy to share or enjoy on your own.';
        }
        if ((kind === 'sunny' || kind === 'hot') && itemTags.indexOf('snack') >= 0) {
            return 'Light, crispy snacks like ' + name + ' pair well with warm sunny weather — quick to eat and full of flavor.';
        }
        if (kind === 'cloudy' && itemTags.indexOf('dimsum') >= 0) {
            return SNACK_LINES[idx % SNACK_LINES.length](name);
        }
        if (kind === 'cloudy' && itemTags.indexOf('comfort') >= 0) {
            return name + ' is a reliable pick for cloudy weather — comforting and easy to order from the menu.';
        }
        if (itemTags.indexOf('siomai') >= 0) {
            return 'Siomai is a popular bite-sized option that works well whatever the sky looks like — hot, juicy, and ready to order.';
        }

        return name + ' fits today\'s ' + state.weatherLabel.toLowerCase() + ' — tap to view it on the shop menu and add it to your order.';
    }

    function rankedItems() {
        var tags = state.weatherTags;
        var scored = catalog.map(function (item) {
            return {
                item: item,
                score: scoreItem(item, tags),
                blurb: weatherBlurb(item),
            };
        });
        scored.sort(function (a, b) {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.item.name.localeCompare(b.item.name);
        });
        var picks = scored.filter(function (row) {
            return row.score > 0;
        });
        if (picks.length < 4) {
            picks = scored;
        }
        return picks.slice(0, 4).map(function (row, i) {
            row.blurb = weatherBlurb(row.item, i);
            return row;
        });
    }

    function applyWeatherTheme() {
        root.setAttribute('data-weather', state.weatherKind);
    }

    function updateContext() {
        if (!contextEl) {
            return;
        }
        var parts = [state.weatherLabel];
        if (typeof state.temperature === 'number') {
            parts.push(Math.round(state.temperature) + '°C');
        }
        parts.push(state.placeLabel);
        contextEl.textContent = parts.join(' · ');
    }

    function renderGrid() {
        if (!gridEl) {
            return;
        }
        var picks = rankedItems();
        gridEl.innerHTML = '';

        if (!picks.length) {
            gridEl.innerHTML = '<p class="crispy-picks__empty">No menu items to suggest yet.</p>';
            return;
        }

        picks.forEach(function (row) {
            var item = row.item;
            var href = menuHref(item.shopId);
            var price = '₱' + Number(item.price).toFixed(2);
            var imgSrc = /^https?:///i.test(item.image || "") ? item.image : imgBase + encodePath(item.image);

            var card = document.createElement('a');
            card.className = 'crispy-picks__card';
            card.setAttribute('role', 'listitem');
            card.href = href;
            card.setAttribute('aria-label', item.name + ' — view on menu at ' + item.shopName);

            card.innerHTML =
                '<span class="crispy-picks__card-media">' +
                '<img src="' + escapeHtml(imgSrc) + '" alt="" width="160" height="120" loading="lazy">' +
                '</span>' +
                '<span class="crispy-picks__card-body">' +
                '<span class="crispy-picks__card-name">' + escapeHtml(item.name) + '</span>' +
                '<span class="crispy-picks__card-meta">' +
                escapeHtml(item.shopName) + ' · ' + escapeHtml(price) +
                '</span>' +
                '<span class="crispy-picks__card-blurb">' + escapeHtml(row.blurb) + '</span>' +
                '<span class="crispy-picks__card-go">View on menu <i class="bi bi-arrow-right" aria-hidden="true"></i></span>' +
                '</span>';

            gridEl.appendChild(card);
        });

        if (noteEl) {
            noteEl.textContent = 'Tap any dish to open that shop\'s menu. Picks update from weather detected in your browser.';
        }
    }

    function applyWeather(data) {
        var current = data && data.current ? data.current : {};
        state.weatherCode = typeof current.weather_code === 'number' ? current.weather_code : null;
        state.temperature = typeof current.temperature_2m === 'number' ? current.temperature_2m : null;
        var w = classifyWeather(state.weatherCode, state.temperature);
        state.weatherKind = w.kind;
        state.weatherLabel = w.label;
        state.weatherTags = w.tags;

        applyWeatherTheme();
        updateContext();
        renderGrid();
    }

    function fetchWeather(lat, lon) {
        var url =
            'https://api.open-meteo.com/v1/forecast?latitude=' +
            encodeURIComponent(lat) +
            '&longitude=' +
            encodeURIComponent(lon) +
            '&current=weather_code,temperature_2m&timezone=auto';

        return fetch(url)
            .then(function (res) {
                return res.json();
            })
            .then(applyWeather)
            .catch(function () {
                state.placeLabel = cfg.defaultPlace || 'your area';
                applyWeather({ current: { weather_code: 0, temperature_2m: 29 } });
            });
    }

    function initWeather() {
        if (!navigator.geolocation) {
            fetchWeather(state.lat, state.lon);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                state.lat = pos.coords.latitude;
                state.lon = pos.coords.longitude;
                state.placeLabel = 'Near you';
                fetchWeather(state.lat, state.lon);
            },
            function () {
                fetchWeather(state.lat, state.lon);
            },
            { timeout: 8000, maximumAge: 600000 }
        );
    }

    initWeather();
})();
