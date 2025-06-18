// ==UserScript==
// @name         活动报名插件 V3.6（抓取商品数据）
// @namespace    https://yourdomain.com
// @version      3.6.0
// @description  支持长期+短期活动展示，抓取可报名商品，控制台输出，Anti-Content自动处理
// @match        https://*.temu.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      agentseller.temu.com
// ==/UserScript==

(function () {
  'use strict';

  const antiContent = "0aqAf...CH"; // 替换为你最新抓包的完整 Anti-Content 值

  function fetchProductsByActivityId() {
    const activityId = document.getElementById('moduled-activity-id')?.value?.trim();
    if (!activityId) {
      alert('请填写活动 ID');
      return;
    }

    const postData = {
      activityType: 13,
      activityThematicId: Number(activityId),
      rowCount: 50,
      addSite: true,
      searchScrollContext: ""
    };

    console.log("📦 [抓取商品] 请求参数:", postData);

    GM_xmlhttpRequest({
      method: "POST",
      url: "https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match",
      headers: {
        "Content-Type": "application/json",
        "Anti-Content": antiContent
      },
      data: JSON.stringify(postData),
      onload: function (res) {
        if (res.status === 200) {
          try {
            const json = JSON.parse(res.responseText);
            console.log("🎯 可报名商品数据：", json?.data?.matchList || json);
          } catch (e) {
            console.error("❌ 数据解析失败：", e);
          }
        } else {
          console.error("❌ 请求失败，状态码：", res.status, res.responseText);
        }
      },
      onerror: function (err) {
        console.error("❌ 抓取出错：", err);
      }
    });
  }

  // 插入输入框和按钮
  function addProductFetchUI() {
    const container = document.createElement("div");
    container.style = "margin:12px 0;";
    container.innerHTML = `
      <input type="text" id="moduled-activity-id" placeholder="输入活动ID" style="width:60%;padding:6px;font-size:14px;" />
      <button id="moduled-fetch-products" style="margin-left:8px;padding:6px 12px;">🎯 抓取商品</button>
    `;
    const submitBtn = document.getElementById("moduled-submit");
    if (submitBtn) {
      submitBtn.insertAdjacentElement("beforebegin", container);
      document.getElementById("moduled-fetch-products").onclick = fetchProductsByActivityId;
    }
  }

  // 等待抽屉加载后挂载
  const originFn = window.__moduled_plugin__;
  window.__moduled_plugin__ = function () {
    originFn?.();
    setTimeout(() => {
      addProductFetchUI();
    }, 1000);
  };
})();
