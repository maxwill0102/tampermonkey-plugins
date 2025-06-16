(function () {
  'use strict';

  const AUTH_URL = 'https://tampermonkey-plugins.vercel.app/auth.json';
  const CONFIG_URL = 'https://tampermonkey-plugins.vercel.app/config.json';

  function checkAuthorization(callback) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: AUTH_URL + '?t=' + Date.now(),
      onload: function (res) {
        if (res.status === 200) {
          try {
            const data = JSON.parse(res.responseText);
            const host = location.hostname;
            const authorized = data.authorizedUsers.some(user => {
              return user.type === 'hostname' && host.includes(user.value);
            });
            if (authorized) {
              console.log('✅ 当前站点已授权，准备加载插件...');
              callback(); // 执行后续插件加载
            } else {
              alert('⚠️ 当前站点未授权，插件已终止。\n请联系管理员申请授权。');
              console.warn('❌ 未授权站点：', host);
            }
          } catch (e) {
            console.error('❌ 授权 JSON 解析失败：', e);
          }
        } else {
          console.error('❌ 授权拉取失败，状态码：', res.status);
        }
      },
      onerror: function (err) {
        console.error('❌ 授权请求异常：', err);
      }
    });
  }

  function loadConfigAndRunPlugins() {
    GM_xmlhttpRequest({
      method: 'GET',
      url: CONFIG_URL + '?t=' + Date.now(),
      onload: function (res) {
        if (res.status === 200) {
          try {
            const config = JSON.parse(res.responseText);
            const plugins = config.plugins || [];

            plugins.forEach(plugin => {
              if (!plugin.enabled) return;

              const versionKey = `plugin_version_${plugin.name}`;
              const lastVersion = GM_getValue(versionKey, '0.0.0');

              if (plugin.version && plugin.version !== lastVersion) {
                console.log(`🔄 插件 ${plugin.name} 已更新版本 (${lastVersion} → ${plugin.version})，触发热更新`);
                GM_setValue(versionKey, plugin.version);
              } else {
                console.log(`📦 加载插件: ${plugin.name} (版本: ${plugin.version || 'unknown'})`);
              }

              // 动态加载脚本
              GM_xmlhttpRequest({
                method: 'GET',
                url: plugin.url + '?t=' + Date.now(),
                onload: function (resp) {
                  try {
                    eval(resp.responseText);
                    console.log(`✅ 插件 ${plugin.name} 已加载成功`);
                  } catch (e) {
                    console.error(`❌ 插件 ${plugin.name} 执行出错：`, e);
                  }
                },
                onerror: function (err) {
                  console.error(`❌ 插件 ${plugin.name} 加载失败：`, err);
                }
              });
            });

          } catch (e) {
            console.error('❌ 配置解析失败：', e);
          }
        } else {
          console.error('❌ 插件配置加载失败，状态码：', res.status);
        }
      },
      onerror: function (err) {
        console.error('❌ 插件配置请求异常：', err);
      }
    });
  }

  // 第一步：授权校验 → 加载插件
  checkAuthorization(loadConfigAndRunPlugins);
})();
