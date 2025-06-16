(function () {
  'use strict';

  const configUrl = 'https://tampermonkey-plugins.vercel.app/config.json?t=' + Date.now();

  // 使用 GM_xmlhttpRequest 请求配置文件
  GM_xmlhttpRequest({
    method: "GET",
    url: configUrl,
    onload: function (res) {
      try {
        const config = JSON.parse(res.responseText);
        const plugins = config.plugins || [];

        plugins.forEach(plugin => {
          if (plugin.enabled && plugin.url) {
            // 动态加载插件
            GM_xmlhttpRequest({
              method: "GET",
              url: plugin.url + '?t=' + Date.now(),
              onload: function (res2) {
                console.log("✅ 插件加载成功：", plugin.name);
                eval(res2.responseText);
              },
              onerror: function (err) {
                console.error("❌ 插件加载失败：", plugin.name, err);
              }
            });
          }
        });
      } catch (e) {
        console.error("❌ 解析 config.json 出错：", e);
      }
    },
    onerror: function (err) {
      console.error("❌ 无法加载 config.json：", err);
    }
  });
})();
