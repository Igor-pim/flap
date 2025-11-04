// ============================================
// Глобальные переменные
// ============================================
let map;
let markers = [];
let currentUser = null;
let userLocation = null;
let userRole = 'buyer'; // 'buyer' или 'seller'
let userStats = {
    ecoScore: 0,
    visits: 0,
    carbonSaved: 0,
    visitHistory: [] // История посещений
};
let eventListenersInitialized = false;
let demoBusinesses = []; // Теперь будет заполняться динамически
let userAddedBusinesses = []; // Бизнесы, добавленные продавцами

// Шаблоны для генерации демо-бизнесов
const businessTemplates = [
    {
        name: "Фермерский рынок 'Своё'",
        type: "Фермерский магазин",
        description: "Натуральные продукты от местных фермеров без посредников. Овощи, фрукты, молочные продукты, мясо.",
        ecoCriteria: ['local', 'organic', 'packaging'],
        ecoPoints: 15,
        carbonReduction: 2.5
    },
    {
        name: "Эко-кафе 'Зелёный лист'",
        type: "Кафе",
        description: "Вегетарианское кафе с органическими продуктами. Минимум отходов, компостирование.",
        ecoCriteria: ['local', 'organic', 'waste', 'energy'],
        ecoPoints: 20,
        carbonReduction: 3.2
    },
    {
        name: "Магазин 'Без упаковки'",
        type: "Продуктовый магазин",
        description: "Первый безупаковочный магазин в районе. Приносите свою тару и покупайте ровно столько, сколько нужно.",
        ecoCriteria: ['packaging', 'local', 'waste', 'social'],
        ecoPoints: 18,
        carbonReduction: 2.8
    },
    {
        name: "Пекарня 'Хлебное место'",
        type: "Пекарня",
        description: "Свежий хлеб на закваске из местной пшеницы. Работаем на солнечных панелях.",
        ecoCriteria: ['local', 'energy', 'organic'],
        ecoPoints: 12,
        carbonReduction: 1.5
    },
    {
        name: "Кооператив 'Народная лавка'",
        type: "Кооператив",
        description: "Кооператив местных производителей. Справедливая торговля, поддержка малого бизнеса.",
        ecoCriteria: ['local', 'social', 'organic'],
        ecoPoints: 14,
        carbonReduction: 2.0
    },
    {
        name: "Эко-маркет 'Природа'",
        type: "Супермаркет",
        description: "Супермаркет с фокусом на органические и локальные продукты. Система переработки упаковки.",
        ecoCriteria: ['local', 'organic', 'waste', 'energy'],
        ecoPoints: 16,
        carbonReduction: 2.3
    },
    {
        name: "Биомаркет 'Чистая еда'",
        type: "Продуктовый магазин",
        description: "Экологичные продукты без химии. Поддержка локальных фермеров.",
        ecoCriteria: ['local', 'organic', 'social'],
        ecoPoints: 16,
        carbonReduction: 2.1
    },
    {
        name: "Веган-бистро 'Зеленая кухня'",
        type: "Кафе",
        description: "100% растительное меню. Компостирование отходов, солнечные панели.",
        ecoCriteria: ['organic', 'waste', 'energy'],
        ecoPoints: 19,
        carbonReduction: 3.0
    }
];

// Функция для генерации случайных координат вокруг центральной точки
function generateRandomLocation(centerLat, centerLng, radiusKm = 3) {
    // Конвертируем радиус в градусы (приблизительно)
    const radiusInDegrees = radiusKm / 111; // 1 градус ≈ 111 км

    // Генерируем случайное смещение
    const u = Math.random();
    const v = Math.random();
    const w = radiusInDegrees * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);

    // Корректируем смещение по долготе с учётом широты
    const newLat = centerLat + y;
    const newLng = centerLng + x / Math.cos(centerLat * Math.PI / 180);

    return { lat: newLat, lng: newLng };
}

// Функция для генерации демо-бизнесов вокруг локации пользователя
function generateDemoBusinesses(centerLat, centerLng, count = 8) {
    demoBusinesses = [];

    for (let i = 0; i < count; i++) {
        const template = businessTemplates[i % businessTemplates.length];
        const location = generateRandomLocation(centerLat, centerLng);

        demoBusinesses.push({
            id: i + 1,
            name: template.name,
            type: template.type,
            lat: location.lat,
            lng: location.lng,
            description: template.description,
            address: `Адрес ${i + 1}`, // В реальном приложении можно использовать Reverse Geocoding
            ecoCriteria: template.ecoCriteria,
            ecoPoints: template.ecoPoints,
            carbonReduction: template.carbonReduction
        });
    }

    console.log(`Сгенерировано ${demoBusinesses.length} демо-бизнесов вокруг координат: ${centerLat}, ${centerLng}`);
}

// Названия эко-критериев
const ecoCriteriaNames = {
    local: { icon: '🏪', name: 'Локальные поставщики' },
    packaging: { icon: '📦', name: 'Без упаковки' },
    organic: { icon: '🌿', name: 'Органические продукты' },
    energy: { icon: '⚡', name: 'Энергоэффективность' },
    waste: { icon: '♻️', name: 'Утилизация отходов' },
    social: { icon: '🤝', name: 'Социальная ответственность' }
};

// ============================================
// Инициализация приложения
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Симуляция загрузки
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');

        // Инициализация Google Auth
        initGoogleAuth();
    }, 2000);

    // Инициализация обработчиков событий
    initEventListeners();
});

// ============================================
// Google OAuth
// ============================================
function initGoogleAuth() {
    // Проверяем демо-режим
    if (CONFIG.DEMO_MODE) {
        console.log('Работа в демо-режиме. Google OAuth отключен.');
        // Скрываем Google кнопку в демо-режиме
        const googleBtnContainer = document.getElementById('google-signin-button');
        if (googleBtnContainer) {
            googleBtnContainer.style.display = 'none';
        }
        return;
    }

    // Проверяем что Google API загружен
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('Google API не загружен. Проверьте интернет-соединение.');
        return;
    }

    try {
        google.accounts.id.initialize({
            client_id: CONFIG.GOOGLE_OAUTH_CLIENT_ID,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        // Показываем кнопку Google Sign-In
        google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            {
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                width: 300
            }
        );

        // Скрываем кастомную кнопку
        document.getElementById('google-signin').style.display = 'none';
        document.getElementById('google-signin-button').style.display = 'block';
    } catch (error) {
        console.error('Ошибка инициализации Google OAuth:', error);
    }
}

function handleGoogleSignIn(response) {
    // Декодируем JWT токен (только для демо, в продакшене делать на сервере)
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));

        currentUser = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture
        };

        showApp();
    } catch (error) {
        console.error('Auth error:', error);
        // Для демо - пропускаем авторизацию
        handleDemoSignIn();
    }
}

// Демо-авторизация (без реального Google)
function handleDemoSignIn() {
    // Получаем выбранную роль
    const selectedRole = document.querySelector('input[name="role"]:checked');
    if (selectedRole) {
        userRole = selectedRole.value;
    }

    // Создаем SVG аватар вместо placeholder
    const svgAvatar = 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
            <rect width="150" height="150" fill="#10b981"/>
            <text x="50%" y="50%" font-size="60" text-anchor="middle" dy=".3em" fill="white">👤</text>
        </svg>
    `);

    currentUser = {
        name: userRole === 'seller' ? 'Демо Продавец' : 'Демо Покупатель',
        email: 'demo@flap.eco',
        picture: svgAvatar
    };

    // Загружаем сохраненные данные
    loadUserStats();

    showApp();
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Обновляем информацию о пользователе
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-avatar').alt = currentUser.name;
    document.getElementById('user-avatar').title = currentUser.name;

    // Отображаем имя пользователя
    const userName = currentUser.name.split(' ')[0]; // Берем только имя
    document.getElementById('user-name').textContent = userName;

    updateEcoScore();

    // Настраиваем интерфейс в зависимости от роли
    if (userRole === 'seller') {
        // Для продавца показываем форму добавления бизнеса
        document.getElementById('seller-interface').classList.remove('hidden');
        document.getElementById('buyer-search-bar').style.display = 'none';
    } else {
        // Для покупателя показываем обычный интерфейс
        document.getElementById('seller-interface').classList.add('hidden');
        document.getElementById('buyer-search-bar').style.display = 'flex';
    }

    // Инициализируем обработчики событий приложения
    initAppEventListeners();

    // Инициализируем счетчик фильтров
    updateFilterCount();

    // Показываем onboarding для новых пользователей покупателей
    if (userRole === 'buyer' && !localStorage.getItem('flapOnboardingShown')) {
        setTimeout(() => {
            showOnboarding();
        }, 500);
    }
}

// ============================================
// Google Maps
// ============================================
function initMap() {
    // Центр карты по умолчанию из конфига
    const defaultCenter = CONFIG.MAP_DEFAULT_CENTER;

    // Показываем скелетон загрузки
    showMapSkeleton();

    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultCenter,
        zoom: CONFIG.MAP_DEFAULT_ZOOM,
        disableDefaultUI: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });

    // Добавляем обработчик для кнопки запроса геолокации
    const requestLocationBtn = document.getElementById('request-location-btn');
    const locationContainer = document.getElementById('location-request-container');

    if (requestLocationBtn) {
        console.log('🔘 Добавляем обработчик клика на кнопку геолокации');
        requestLocationBtn.addEventListener('click', function(e) {
            console.log('🖱️ КЛИК НА КНОПКУ ГЕОЛОКАЦИИ!', e);
            requestUserLocation();
        });
    } else {
        console.error('❌ requestLocationBtn не найден!');
    }

    // Определяем мобильное устройство
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Проверяем контекст
    const isSecureContext = window.isSecureContext ||
                           window.location.protocol === 'https:' ||
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';

    console.log('📱 Мобильное устройство:', isMobile);
    console.log('🔒 Протокол:', window.location.protocol);
    console.log('🌐 Хост:', window.location.hostname);
    console.log('✅ Безопасный контекст:', isSecureContext);

    // На мобильных через HTTP - сразу показываем заведения и кнопку
    if (isMobile && !isSecureContext) {
        console.log('⚠️ Мобильное устройство + HTTP - показываем кнопку и заведения');

        // Используем центр из конфига
        userLocation = defaultCenter;
        generateDemoBusinesses(userLocation.lat, userLocation.lng, 8);
        addBusinessMarkers();
        hideMapSkeleton();

        // Показываем контейнер с кнопкой
        console.log('🔍 locationContainer:', locationContainer);

        if (locationContainer) {
            console.log('✅ Контейнер найден, показываем');
            locationContainer.classList.remove('hidden');
            console.log('✅ Кнопка геолокации показана');
        } else {
            console.error('❌ locationContainer не найден!');
        }

        showToast('📍 Нажмите кнопку для определения местоположения', 'info');
    } else {
        // Десктоп или HTTPS - пытаемся получить геолокацию автоматически
        console.log('🖥️ Десктоп или HTTPS - пробуем автоматическую геолокацию');
        requestUserLocation();
    }
}

function requestUserLocation() {
    const locationContainer = document.getElementById('location-request-container');

    if (!navigator.geolocation) {
        console.error('Геолокация не поддерживается');
        handleGeolocationError('NOT_SUPPORTED');
        return;
    }

    // Скрываем контейнер с кнопкой и показываем загрузку
    showMapSkeleton();
    if (locationContainer) {
        locationContainer.classList.add('hidden');
    }

    console.log('Запрашиваем геолокацию...');
    showToast('Запрашиваем доступ к местоположению...', 'info');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            console.log('✅ Геолокация получена:', userLocation);

            // Очищаем старые маркеры
            markers.forEach(marker => marker.setMap(null));
            markers = [];

            // Генерируем демо-бизнесы вокруг локации пользователя
            generateDemoBusinesses(userLocation.lat, userLocation.lng, 8);

            // Центрируем карту на пользователе с анимацией
            map.panTo(userLocation);
            map.setZoom(14);

            // Добавляем маркер пользователя
            new google.maps.Marker({
                position: userLocation,
                map: map,
                title: 'Вы здесь',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3
                }
            });

            // Добавляем маркеры для всех бизнесов
            addBusinessMarkers();

            // Скрываем скелетон и кнопку
            hideMapSkeleton();
            const locationContainer = document.getElementById('location-request-container');
            if (locationContainer) {
                locationContainer.classList.add('hidden');
            }

            showToast('✅ Найдено ' + demoBusinesses.length + ' эко-заведений рядом с вами!', 'success');
        },
        (error) => {
            console.error('❌ Ошибка геолокации:', error.code, error.message);
            handleGeolocationError(error.code);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

function handleGeolocationError(errorCode) {
    const defaultCenter = CONFIG.MAP_DEFAULT_CENTER;
    const locationContainer = document.getElementById('location-request-container');

    console.log('Обработка ошибки геолокации. Код:', errorCode);

    // Проверяем, не сгенерированы ли уже бизнесы
    if (demoBusinesses.length === 0) {
        // Используем центр из конфига
        userLocation = defaultCenter;
        generateDemoBusinesses(userLocation.lat, userLocation.lng, 8);

        // Добавляем маркеры для всех бизнесов
        addBusinessMarkers();
    }

    // Скрываем скелетон
    hideMapSkeleton();

    // Показываем кнопку для повторного запроса (кроме NOT_SUPPORTED)
    if (locationContainer && errorCode !== 'NOT_SUPPORTED') {
        locationContainer.classList.remove('hidden');
        console.log('Кнопка геолокации показана');
    }

    // Показываем сообщение в зависимости от ошибки
    let message = '';
    let type = 'warning';

    switch (errorCode) {
        case 1: // PERMISSION_DENIED
            message = '📍 Разрешите доступ к местоположению в настройках браузера, затем нажмите кнопку на карте';
            type = 'warning';
            break;
        case 2: // POSITION_UNAVAILABLE
            message = '⚠️ Не удалось определить местоположение. Попробуйте еще раз или используйте поиск';
            type = 'warning';
            break;
        case 3: // TIMEOUT
            message = '⏱️ Время ожидания истекло. Нажмите кнопку на карте для повторной попытки';
            type = 'warning';
            break;
        case 'NOT_SUPPORTED':
            message = '❌ Геолокация не поддерживается. Используйте поиск для нахождения заведений';
            type = 'info';
            if (locationContainer) {
                locationContainer.classList.add('hidden');
            }
            break;
        default:
            message = '📍 Нажмите кнопку на карте для определения местоположения';
            type = 'info';
    }

    showToast(message, type);
}

function addBusinessMarkers() {
    // Очищаем старые маркеры
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // Получаем активные фильтры
    const activeFilters = getActiveFilters();

    // Объединяем демо-бизнесы и бизнесы от продавцов
    const allBusinesses = [...demoBusinesses, ...userAddedBusinesses];

    // Фильтруем бизнесы
    const filteredBusinesses = allBusinesses.filter(business => {
        if (activeFilters.length === 0) return true;
        return activeFilters.every(filter => business.ecoCriteria.includes(filter));
    });

    // Добавляем маркеры
    filteredBusinesses.forEach(business => {
        // Проверяем, это бизнес от продавца или демо
        const isUserAdded = userAddedBusinesses.some(b => b.id === business.id);

        const marker = new google.maps.Marker({
            position: { lat: business.lat, lng: business.lng },
            map: map,
            title: business.name,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: isUserAdded ? '#f59e0b' : '#10b981', // Оранжевый для добавленных продавцом
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            }
        });

        marker.addListener('click', () => {
            showBusinessDetails(business);
        });

        markers.push(marker);
    });
}

// ============================================
// Обработчики событий
// ============================================
function initEventListeners() {
    // Google Sign In (инициализируется до авторизации)
    const googleBtn = document.getElementById('google-signin');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            // Для демо сразу авторизуем
            handleDemoSignIn();
        });
    }
}

function initAppEventListeners() {
    // Защита от повторной инициализации
    if (eventListenersInitialized) {
        console.warn('⚠️ Обработчики уже инициализированы, пропускаем');
        return;
    }

    console.log('🎯 Инициализация обработчиков событий приложения');

    // Фильтры
    const filterToggle = document.getElementById('filter-toggle');
    if (filterToggle) {
        filterToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFilters();
        });
        console.log('✅ Обработчик filter-toggle добавлен');
    } else {
        console.error('❌ filter-toggle не найден!');
    }

    const filterCheckboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
    console.log(`📋 Найдено ${filterCheckboxes.length} чекбоксов фильтров`);
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });

    // Поиск
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        clearSearchBtn.addEventListener('click', clearSearch);
    }

    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
        // Загружаем сохраненную тему
        if (localStorage.getItem('flapDarkMode') === 'true') {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️';
        }
    }

    // История посещений
    const historyBtn = document.getElementById('history-btn');
    const closeHistory = document.getElementById('close-history');
    if (historyBtn && closeHistory) {
        historyBtn.addEventListener('click', showHistoryModal);
        closeHistory.addEventListener('click', hideHistoryModal);
        document.getElementById('history-modal').addEventListener('click', (e) => {
            if (e.target.id === 'history-modal') {
                hideHistoryModal();
            }
        });
    }

    // Панель деталей
    document.getElementById('close-details').addEventListener('click', hideBusinessDetails);
    document.getElementById('mark-visited').addEventListener('click', markAsVisited);

    // FAB и модальное окно
    document.getElementById('impact-fab').addEventListener('click', showImpactModal);
    document.getElementById('close-impact').addEventListener('click', hideImpactModal);

    // Закрытие модального окна по клику вне его
    document.getElementById('impact-modal').addEventListener('click', (e) => {
        if (e.target.id === 'impact-modal') {
            hideImpactModal();
        }
    });

    // Onboarding
    initOnboardingListeners();

    // Интерфейс продавца
    if (userRole === 'seller') {
        initSellerInterface();
    }

    eventListenersInitialized = true;
    console.log('✅ Все обработчики инициализированы');
}

function toggleFilters() {
    console.log('🔍 toggleFilters вызвана');
    const panel = document.getElementById('filter-panel');

    if (!panel) {
        console.error('❌ filter-panel не найдена!');
        return;
    }

    const isActive = panel.classList.toggle('active');
    console.log(`🎨 Панель ${isActive ? 'ОТКРЫТА' : 'ЗАКРЫТА'}`);
    console.log('📦 Классы панели:', panel.className);
    console.log('📏 Высота панели:', window.getComputedStyle(panel).maxHeight);
}

function handleFilterChange() {
    updateFilterCount();
    addBusinessMarkers();
}

function getActiveFilters() {
    const checkboxes = document.querySelectorAll('.filter-option input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateFilterCount() {
    const activeFilters = getActiveFilters();
    const countElement = document.getElementById('active-filters');

    if (activeFilters.length > 0) {
        countElement.textContent = activeFilters.length;
        countElement.classList.remove('hidden');
    } else {
        countElement.classList.add('hidden');
    }
}

// ============================================
// Детали бизнеса
// ============================================
function showBusinessDetails(business) {
    console.log('Открываем карточку бизнеса:', business.name);

    const panel = document.getElementById('details-panel');

    // Обновляем содержимое панели
    document.getElementById('business-name').textContent = business.name;
    document.getElementById('business-type').textContent = business.type;
    document.getElementById('business-description').textContent = business.description;
    document.getElementById('business-address').textContent = business.address;
    document.getElementById('visit-points').textContent = `+${business.ecoPoints} 🌿`;
    document.getElementById('carbon-reduction').textContent = `~${business.carbonReduction} кг CO₂`;

    // Обновляем эко-бейджи
    const badgesContainer = document.getElementById('eco-badges');
    badgesContainer.innerHTML = '';

    business.ecoCriteria.forEach(criteria => {
        const badge = document.createElement('div');
        badge.className = 'eco-badge';
        badge.innerHTML = `
            <span>${ecoCriteriaNames[criteria].icon}</span>
            <span>${ecoCriteriaNames[criteria].name}</span>
        `;
        badgesContainer.appendChild(badge);
    });

    // Сохраняем текущий бизнес для кнопки "Отметить посещение"
    document.getElementById('mark-visited').dataset.businessId = business.id;
    document.getElementById('mark-visited').dataset.ecoPoints = business.ecoPoints;
    document.getElementById('mark-visited').dataset.carbonReduction = business.carbonReduction;

    // Показываем панель - убираем hidden и добавляем active
    panel.classList.remove('hidden');
    setTimeout(() => {
        panel.classList.add('active');
    }, 10);
}

function hideBusinessDetails() {
    const panel = document.getElementById('details-panel');
    panel.classList.remove('active');
    setTimeout(() => {
        panel.classList.add('hidden');
    }, 300); // После завершения анимации
}

function markAsVisited(e) {
    const businessId = parseInt(e.target.dataset.businessId);
    const ecoPoints = parseInt(e.target.dataset.ecoPoints);
    const carbonReduction = parseFloat(e.target.dataset.carbonReduction);

    // Находим бизнес
    const business = demoBusinesses.find(b => b.id === businessId) ||
                    userAddedBusinesses.find(b => b.id === businessId);

    // Обновляем статистику
    userStats.ecoScore += ecoPoints;
    userStats.visits += 1;
    userStats.carbonSaved += carbonReduction;

    // Добавляем в историю посещений
    userStats.visitHistory.push({
        businessId: businessId,
        businessName: business ? business.name : 'Неизвестно',
        date: new Date().toISOString(),
        ecoPoints: ecoPoints,
        carbonReduction: carbonReduction
    });

    // Сохраняем в LocalStorage
    saveUserStats();

    // Обновляем UI
    updateEcoScore();
    checkAchievements();

    // Показываем уведомление через новую систему toast
    showToast(`+${ecoPoints} эко-баллов! 🎉`, 'success');

    // Закрываем панель
    hideBusinessDetails();
}

// ============================================
// Эко-баллы и статистика
// ============================================
function updateEcoScore() {
    document.getElementById('eco-score').textContent = `${userStats.ecoScore} 🌿`;
}

function showImpactModal() {
    document.getElementById('total-eco-score').textContent = userStats.ecoScore;
    document.getElementById('total-visits').textContent = userStats.visits;
    document.getElementById('total-carbon').textContent = userStats.carbonSaved.toFixed(1);

    document.getElementById('impact-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('impact-modal').classList.add('active');
    }, 10);
}

function hideImpactModal() {
    document.getElementById('impact-modal').classList.remove('active');
    setTimeout(() => {
        document.getElementById('impact-modal').classList.add('hidden');
    }, 300);
}

// ============================================
// Достижения
// ============================================
function checkAchievements() {
    const achievements = document.querySelectorAll('.achievement');

    // Новичок - 1 посещение
    if (userStats.visits >= 1) {
        achievements[0].classList.remove('locked');
        achievements[0].classList.add('unlocked');
    }

    // Эко-энтузиаст - 5 посещений
    if (userStats.visits >= 5) {
        achievements[1].classList.remove('locked');
        achievements[1].classList.add('unlocked');
    }

    // Эко-герой - 20 посещений
    if (userStats.visits >= 20) {
        achievements[2].classList.remove('locked');
        achievements[2].classList.add('unlocked');
    }
}

// ============================================
// Уведомления (Toast)
// ============================================
function showToast(message, type = 'info') {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        animation: slideDown 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 90%;
    `;
    toast.innerHTML = `<span style="font-size: 18px;">${icons[type] || icons.info}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ============================================
// LocalStorage для сохранения данных
// ============================================
function saveUserStats() {
    try {
        localStorage.setItem('flapUserStats', JSON.stringify(userStats));
        localStorage.setItem('flapUserRole', userRole);
        if (userAddedBusinesses.length > 0) {
            localStorage.setItem('flapUserBusinesses', JSON.stringify(userAddedBusinesses));
        }
    } catch (e) {
        console.error('Ошибка сохранения в LocalStorage:', e);
    }
}

function loadUserStats() {
    try {
        const saved = localStorage.getItem('flapUserStats');
        if (saved) {
            userStats = JSON.parse(saved);
        }

        const savedRole = localStorage.getItem('flapUserRole');
        if (savedRole) {
            userRole = savedRole;
        }

        const savedBusinesses = localStorage.getItem('flapUserBusinesses');
        if (savedBusinesses) {
            userAddedBusinesses = JSON.parse(savedBusinesses);
        }
    } catch (e) {
        console.error('Ошибка загрузки из LocalStorage:', e);
    }
}

// ============================================
// Скелетоны загрузки
// ============================================
function showMapSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.id = 'map-skeleton';
    skeleton.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
    `;
    skeleton.innerHTML = `
        <div style="font-size: 48px;">🗺️</div>
        <div style="font-size: 16px; color: #6b7280; font-weight: 600;">Загрузка карты...</div>
    `;

    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.appendChild(skeleton);
    }
}

function hideMapSkeleton() {
    const skeleton = document.getElementById('map-skeleton');
    if (skeleton) {
        skeleton.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (skeleton.parentNode) {
                skeleton.parentNode.removeChild(skeleton);
            }
        }, 300);
    }
}

// ============================================
// Поиск бизнесов
// ============================================
function searchBusinesses(query) {
    if (!query || query.trim() === '') {
        return [...demoBusinesses, ...userAddedBusinesses];
    }

    const lowerQuery = query.toLowerCase().trim();
    const allBusinesses = [...demoBusinesses, ...userAddedBusinesses];

    return allBusinesses.filter(b =>
        b.name.toLowerCase().includes(lowerQuery) ||
        b.type.toLowerCase().includes(lowerQuery) ||
        b.description.toLowerCase().includes(lowerQuery) ||
        b.address.toLowerCase().includes(lowerQuery)
    );
}

// CSS анимации для уведомлений и скелетонов
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    @keyframes slideUp {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
    }
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// ============================================
// Поиск бизнесов - обработчики
// ============================================
function handleSearch(e) {
    const query = e.target.value;
    const clearBtn = document.getElementById('clear-search');

    if (query.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    // Фильтруем маркеры на карте
    const results = searchBusinesses(query);
    updateMarkersForSearch(results);
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.value = '';
    document.getElementById('clear-search').classList.add('hidden');

    // Показываем все маркеры
    addBusinessMarkers();
}

function updateMarkersForSearch(filteredBusinesses) {
    // Очищаем старые маркеры
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // Добавляем только отфильтрованные маркеры
    filteredBusinesses.forEach(business => {
        const marker = new google.maps.Marker({
            position: { lat: business.lat, lng: business.lng },
            map: map,
            title: business.name,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#10b981',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            }
        });

        marker.addListener('click', () => {
            showBusinessDetails(business);
        });

        markers.push(marker);
    });

    if (filteredBusinesses.length === 0) {
        showToast('Ничего не найдено. Попробуйте другой запрос.', 'info');
    }
}

// ============================================
// Dark Mode
// ============================================
function toggleDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const isDark = document.body.classList.toggle('dark-mode');

    darkModeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('flapDarkMode', isDark);

    showToast(isDark ? 'Темная тема включена' : 'Светлая тема включена', 'info');
}

// ============================================
// История посещений
// ============================================
function showHistoryModal() {
    const historyList = document.getElementById('history-list');

    if (userStats.visitHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-message">Пока нет посещений. Начните отмечать посещения эко-заведений!</p>';
    } else {
        // Сортируем по дате (новые сначала)
        const sortedHistory = [...userStats.visitHistory].reverse();

        historyList.innerHTML = sortedHistory.map(visit => {
            const date = new Date(visit.date);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <div class="history-item-name">${visit.businessName}</div>
                        <div class="history-item-date">${formattedDate}</div>
                    </div>
                    <div class="history-item-stats">
                        <div class="history-item-stat">
                            <span>🌿</span>
                            <span>+${visit.ecoPoints} баллов</span>
                        </div>
                        <div class="history-item-stat">
                            <span>🌍</span>
                            <span>-${visit.carbonReduction} кг CO₂</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('history-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('history-modal').classList.add('active');
    }, 10);
}

function hideHistoryModal() {
    document.getElementById('history-modal').classList.remove('active');
    setTimeout(() => {
        document.getElementById('history-modal').classList.add('hidden');
    }, 300);
}

// ============================================
// Onboarding туториал
// ============================================
let currentOnboardingSlide = 0;

function showOnboarding() {
    document.getElementById('onboarding-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('onboarding-modal').classList.add('active');
    }, 10);
}

function hideOnboarding() {
    document.getElementById('onboarding-modal').classList.remove('active');
    setTimeout(() => {
        document.getElementById('onboarding-modal').classList.add('hidden');
    }, 300);
    localStorage.setItem('flapOnboardingShown', 'true');
}

function initOnboardingListeners() {
    const prevBtn = document.getElementById('onboarding-prev');
    const nextBtn = document.getElementById('onboarding-next');
    const finishBtn = document.getElementById('onboarding-finish');
    const skipBtn = document.getElementById('onboarding-skip');
    const closeBtn = document.getElementById('close-onboarding');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentOnboardingSlide > 0) {
                changeOnboardingSlide(currentOnboardingSlide - 1);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentOnboardingSlide < 3) {
                changeOnboardingSlide(currentOnboardingSlide + 1);
            }
        });
    }

    if (finishBtn) {
        finishBtn.addEventListener('click', hideOnboarding);
    }

    if (skipBtn) {
        skipBtn.addEventListener('click', hideOnboarding);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', hideOnboarding);
    }

    // Закрытие по клику вне модального окна
    document.getElementById('onboarding-modal').addEventListener('click', (e) => {
        if (e.target.id === 'onboarding-modal') {
            hideOnboarding();
        }
    });

    // Dots navigation
    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            const slideIndex = parseInt(e.target.dataset.dot);
            changeOnboardingSlide(slideIndex);
        });
    });
}

function changeOnboardingSlide(newIndex) {
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('onboarding-prev');
    const nextBtn = document.getElementById('onboarding-next');
    const finishBtn = document.getElementById('onboarding-finish');
    const skipBtn = document.getElementById('onboarding-skip');

    // Удаляем активный класс со всех слайдов и точек
    slides.forEach(slide => {
        slide.classList.remove('active', 'prev');
    });
    dots.forEach(dot => dot.classList.remove('active'));

    // Добавляем класс prev к предыдущему слайду
    if (newIndex < currentOnboardingSlide) {
        slides[currentOnboardingSlide].classList.add('prev');
    }

    // Активируем новый слайд
    slides[newIndex].classList.add('active');
    dots[newIndex].classList.add('active');

    // Управление кнопками
    if (newIndex === 0) {
        prevBtn.style.display = 'none';
        skipBtn.style.display = 'block';
    } else {
        prevBtn.style.display = 'block';
        skipBtn.style.display = 'none';
    }

    if (newIndex === 3) {
        nextBtn.classList.add('hidden');
        finishBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        finishBtn.classList.add('hidden');
    }

    currentOnboardingSlide = newIndex;
}

// ============================================
// Интерфейс продавца
// ============================================
function initSellerInterface() {
    const form = document.getElementById('add-business-form');
    const closeBtn = document.getElementById('close-seller-interface');

    if (form) {
        form.addEventListener('submit', handleAddBusiness);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите закрыть форму? Несохраненные данные будут потеряны.')) {
                window.location.reload();
            }
        });
    }
}

function handleAddBusiness(e) {
    e.preventDefault();

    const name = document.getElementById('business-name-input').value;
    const type = document.getElementById('business-type-input').value;
    const description = document.getElementById('business-description-input').value;
    const address = document.getElementById('business-address-input').value;

    // Получаем выбранные критерии
    const criteriaCheckboxes = document.querySelectorAll('.criteria-checkbox input[type="checkbox"]:checked');
    const criteria = Array.from(criteriaCheckboxes).map(cb => cb.value);

    if (criteria.length === 0) {
        showToast('Пожалуйста, выберите хотя бы один эко-критерий', 'error');
        return;
    }

    // Создаем новый бизнес на текущей позиции карты
    const center = map.getCenter();
    const newBusiness = {
        id: Date.now(), // Уникальный ID
        name: name,
        type: type,
        description: description,
        address: address,
        lat: center.lat(),
        lng: center.lng(),
        ecoCriteria: criteria,
        ecoPoints: Math.floor(10 + criteria.length * 3), // Баллы зависят от количества критериев
        carbonReduction: parseFloat((1.5 + criteria.length * 0.5).toFixed(1))
    };

    // Добавляем в массив
    userAddedBusinesses.push(newBusiness);

    // Сохраняем
    saveUserStats();

    // Добавляем маркер на карту
    const marker = new google.maps.Marker({
        position: { lat: newBusiness.lat, lng: newBusiness.lng },
        map: map,
        title: newBusiness.name,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#f59e0b', // Оранжевый цвет для бизнесов от продавцов
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
        }
    });

    marker.addListener('click', () => {
        showBusinessDetails(newBusiness);
    });

    markers.push(marker);

    // Очищаем форму
    e.target.reset();

    // Показываем уведомление
    showToast(`Заведение "${name}" успешно добавлено! 🎉`, 'success');

    // Центрируем карту на новом бизнесе
    map.panTo({ lat: newBusiness.lat, lng: newBusiness.lng });
}

// ============================================
// Глобальная функция для Google Maps callback
// ============================================
window.initMap = initMap;
