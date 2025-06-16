(function () {
  'use strict';

  const LOGIN_API = 'https://tampermonkey-plugins.vercel.app/api/login';
  const USER_API = 'https://tampermonkey-plugins.vercel.app/api/user';

  async function loginUser(username, password) {
    const res = await fetch(LOGIN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) throw new Error('登录失败');
    const data = await res.json();
    GM_setValue('token', data.token);
    return data.token;
  }

  async function fetchUser(token) {
    const res = await fetch(USER_API, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('验证失败');
    return await res.json(); // { username, roles, expires }
  }
function showLoginForm() {
  const wrapper = document.createElement('div');
  wrapper.id = 'plugin-login-wrapper';
  wrapper.style.cssText = `
    position:fixed;
    top:80px;
    right:20px;
    background:white;
    border:1px solid #ccc;
    padding:10px;
    z-index:999999;
    font-size:14px;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    font-family: Arial;
  `;
  wrapper.innerHTML = `
    <div style="font-weight:bold;margin-bottom:6px;">🔐 插件登录</div>
    <input id="plugin-username" placeholder="账号" style="margin:5px 0;width:180px;height:24px;"><br>
    <input id="plugin-password" type="password" placeholder="密码" style="margin-bottom:5px;width:180px;height:24px;"><br>
    <button id="plugin-login" style="width:100%;height:30px;">登录</button>
    <div id="plugin-msg" style="color:red;margin-top:6px;"></div>
  `;
  document.body.appendChild(wrapper);

  document.getElementById('plugin-login').onclick = async () => {
    const username = document.getElementById('plugin-username').value.trim();
    const password = document.getElementById('plugin-password').value.trim();
    document.getElementById('plugin-msg').innerText = '正在登录...';
    try {
      const token = await loginUser(username, password);
      location.reload(); // 成功后刷新
    } catch (e) {
      document.getElementById('plugin-msg').innerText = '❌ 登录失败，请检查账号或密码';
    }
  };
}



  async function init() {
    const token = GM_getValue('token');
    if (!token) {
      console.log('未登录，显示登录框');
      return showLoginForm();
    }

    try {
      const user = await fetchUser(token);
      console.log(`✅ 登录成功：${user.username}，权限模块：${user.roles.join(', ')}`);

      // 加载插件模块
      const CONFIG_URL = 'https://tampermonkey-plugins.vercel.app/config.json';
      fetch(CONFIG_URL + '?t=' + Date.now())
        .then(res => res.json())
        .then(config => {
          const plugins = config.plugins || [];
          plugins.forEach(plugin => {
            if (!plugin.enabled || !user.roles.includes(plugin.name)) return;

            GM_xmlhttpRequest({
              method: 'GET',
              url: plugin.url + '?t=' + Date.now(),
              onload: function (resp) {
                try {
                  eval(resp.responseText);
                  console.log(`✅ 插件模块 ${plugin.name} 加载成功`);
                } catch (e) {
                  console.error(`❌ 插件模块 ${plugin.name} 执行出错：`, e);
                }
              },
              onerror: function (err) {
                console.error(`❌ 插件模块 ${plugin.name} 加载失败：`, err);
              }
            });
          });
        });
    } catch (err) {
      console.warn('❌ 登录状态无效，请重新登录');
      GM_setValue('token', null);
      showLoginForm();
    }
  }

  init();
})();
