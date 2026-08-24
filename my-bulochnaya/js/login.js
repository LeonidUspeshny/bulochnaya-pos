console.log('>>> login.js: загружен');

document.addEventListener('DOMContentLoaded', () => {
  console.log('>>> DOM загружен');
  
  const form = document.querySelector('form');
  console.log('>>> Найдена форма:', form);

  if (!form) {
    console.error('>>> ОШИБКА: на странице нет тега <form>');
    return;
  }

  const userEl = document.getElementById('username');
  const passEl = document.getElementById('password');
  const msgEl = document.getElementById('message');

  console.log('>>> username field:', userEl);
  console.log('>>> password field:', passEl);

  if (!userEl || !passEl) {
    console.error('>>> ОШИБКА: не найдены поля с id="username" и id="password"');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // ГЛАВНОЕ: отменяем стандартную отправку формы
    console.log('>>> Форма отправлена (submit сработал!)');

    const username = userEl.value.trim();
    const password = passEl.value.trim();

    if (!username || !password) {
      console.warn('>>> Пустые поля');
      if (msgEl) msgEl.textContent = 'Введите логин и пароль';
      return;
    }

    try {
      console.log(`>>> Отправляем POST /api/login для: ${username}`);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        console.error(`>>> Сервер вернул HTTP ${res.status}`);
        throw new Error('HTTP error');
      }

      const data = await res.json();
      console.log('>>> Ответ сервера:', data);
      console.log('>>> data.success =', data.success, '(тип:', typeof data.success, ')');

      if (data.success === true) {
        console.log('>>> УСПЕХ! Делаем редирект на /');
        window.location.href = '/';
      } else {
        console.warn('>>> Авторизация отклонена');
        if (msgEl) {
          msgEl.textContent = data.message || 'Неверный логин или пароль';
        }
      }
    } catch (err) {
      console.error('>>> Ошибка сети/парсинга:', err);
      if (err instanceof SyntaxError && err.message.includes('Unexpected token')) {
        console.error('>>> ВНИМАНИЕ: Сервер вернул HTML вместо JSON. Проверь логи node server.js!');
      }
      if (msgEl) msgEl.textContent = 'Ошибка связи с сервером';
    }
  });
});
