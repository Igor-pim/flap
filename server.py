#!/usr/bin/env python3
"""
Простой HTTPS сервер для FLAP приложения
"""

import http.server
import socketserver
import ssl
import os
import sys

PORT = 8001

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Добавляем заголовки для CORS (если нужно)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        # Логирование запросов
        print(f"[{self.log_date_time_string()}] {format % args}")

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # Проверяем наличие SSL сертификатов
    cert_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cert.pem')
    key_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'key.pem')

    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("❌ SSL сертификаты не найдены!")
        print("Создайте их командой:")
        print('openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=GE/ST=Adjara/L=Kobuleti/O=FLAP/OU=Dev/CN=192.168.0.182"')
        sys.exit(1)

    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        # Настраиваем SSL контекст
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=cert_file, keyfile=key_file)
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

        print(f"🌱 FLAP сервер запущен на порту {PORT} (HTTPS)")
        print(f"📱 Откройте в браузере: https://localhost:{PORT}")
        print(f"🌍 Или с вашего телефона: https://192.168.0.182:{PORT}")
        print(f"⚠️  Примите предупреждение о самоподписанном сертификате в браузере")
        print(f"\nНажмите Ctrl+C для остановки сервера\n")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Сервер остановлен")
            httpd.shutdown()

if __name__ == "__main__":
    run_server()
