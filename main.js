(function () {
  'use strict';

  const configUrl = 'https://tampermonkey-plugins.vercel.app/config.json?t=' + Date.now();

  // 🔧 拉取插件配置
  GM_xmlhttpRequest({
    method: "GET",
    url: configUrl,
    onload: function (res) {
      try {
        const config = JSON.parse(res.responseText);
        const plugins = config.plugins || [];

        console.log("📦 获取插件配置成功，共", plugins.length, "个插件");

        loadRemotePlugins(plugins);
      } catch (err) {
        console.error("❌ 解析插件配置失败:", err);
      }
    },
    onerror: function (err) {
      console.error("❌ 拉取插件配置失败:", err);
    }
  });

  // 🔄 遍历并加载插件
  function loadRemotePlugins(pluginList) {
    pluginList.forEach(plugin => {
      if (!plugin.enabled) return;

      GM_xmlhttpRequest({
        method: "GET",
        url: plugin.url + '?v=' + plugin.version + '&t=' + Date.now(),
        onload: function (res) {
          console.log(`📥 加载插件: ${plugin.name} (版本: ${plugin.version})`);
          try {
            eval(res.responseText);
            console.log(`✅ 插件 ${plugin.name} 已成功载入`);
          } catch (err) {
            console.error(`❌ 插件 ${plugin.name} 执行出错:`, err);
          }
        },
        onerror: function (err) {
          console.error(`❌ 插件 ${plugin.name} 加载失败:`, err);
        }
      });
    });
  }
})();
