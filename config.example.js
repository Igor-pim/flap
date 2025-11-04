// Конфигурация FLAP приложения (ПРИМЕР)
// Скопируйте этот файл как config.js и добавьте свои API ключи

const CONFIG = {
    // Google Maps API ключ
    // Получить: https://console.cloud.google.com/
    // 1. Создайте проект
    // 2. Включите Maps JavaScript API и Places API
    // 3. Создайте API ключ
    GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',

    // Google OAuth Client ID
    // Получить: https://console.cloud.google.com/apis/credentials
    // 1. Создайте OAuth 2.0 Client ID
    // 2. Тип: Web application
    // 3. Добавьте authorized JavaScript origins:
    //    - http://localhost:8000
    //    - http://<ваш_IP>:8000
    GOOGLE_OAUTH_CLIENT_ID: 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com',

    // Настройки карты по умолчанию
    MAP_DEFAULT_CENTER: {
        lat: 55.753215,  // Москва
        lng: 37.618423
    },
    MAP_DEFAULT_ZOOM: 15,

    // Демо режим (для работы без реальных API ключей)
    // Если true - будет работать с демо-данными без реальной авторизации
    DEMO_MODE: true
};
