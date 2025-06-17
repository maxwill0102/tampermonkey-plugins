// ==UserScript==
// @name         活动报名插件 V3（UI 分页优化）
// @namespace    https://yourdomain.com
// @version      3.0.2
// @description  长短期活动报名工具，含 UI 分页与滑动支持
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ...样式部分保持不变...

  async function fetchActivityData() {
    // 长期活动提取（保持不变）...

    // 短期活动处理
    const shortPanelRoots = [
      document.getElementById('moduled-tab-0'),
      document.getElementById('moduled-tab-1'),
      document.getElementById('moduled-tab-2'),
    ];
    
    // 1. 更健壮的tab容器选择器
    const tabContainer = document.querySelector('.TAB_tabContentInnerContainer_5-118-0, [data-testid="beast-core-tab-top"]');
    if (!tabContainer) {
      console.warn('未找到短期活动 tab 容器');
      return;
    }
    
    const tabs = tabContainer.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"], .TAB_capsule_5-118-0');
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function clickAndExtractTabs() {
      for (let i = 0; i < tabs.length; i++) {
        try {
          const tab = tabs[i];
          tab.click();
          await delay(1000); // 增加等待时间
          
          // 2. 使用更通用的表格选择器
          const table = document.querySelector('.beast-table-container, table');
          if (!table) {
            console.warn(`第 ${i+1} 个标签页未找到表格`);
            continue;
          }
          
          // 3. 提取表头和内容
          const container = shortPanelRoots[i] || shortPanelRoots[0];
          container.innerHTML = '';
          
          // 提取表头
          const headers = [];
          const headerRow = table.querySelector('thead tr');
          if (headerRow) {
            headerRow.querySelectorAll('th').forEach(th => {
              headers.push(th.innerText.trim());
            });
          }
          
          // 添加表头
          if (headers.length > 0) {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'moduled-table-header';
            headerDiv.style.gridTemplateColumns = `repeat(${headers.length}, 1fr)`;
            
            headers.forEach(headerText => {
              const headerCell = document.createElement('div');
              headerCell.textContent = headerText;
              headerDiv.appendChild(headerCell);
            });
            container.appendChild(headerDiv);
          }
          
          // 4. 提取表格内容
          const rows = table.querySelectorAll('tbody tr');
          if (rows.length === 0) {
            console.warn(`第 ${i+1} 个标签页表格无数据行`);
          }
          
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
              const rowDiv = document.createElement('div');
              rowDiv.className = 'moduled-table-row';
              rowDiv.style.gridTemplateColumns = `repeat(${cells.length}, 1fr)`;
              
              cells.forEach(cell => {
                const cellDiv = document.createElement('div');
                // 5. 保留原始HTML内容（包括按钮）
                cellDiv.innerHTML = cell.innerHTML; 
                rowDiv.appendChild(cellDiv);
              });
              
              container.appendChild(rowDiv);
            }
          });
          
          // 6. 如果没有找到任何内容，显示提示
          if (container.innerHTML === '') {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">未找到活动数据</div>';
          }
        } catch (error) {
          console.error(`处理第 ${i+1} 个标签页时出错:`, error);
        }
      }
    }

    clickAndExtractTabs();
  }

  // 7. 添加重试机制
  function initPlugin() {
    try {
      createDrawer();
    } catch (error) {
      console.error('插件初始化失败，5秒后重试', error);
      setTimeout(initPlugin, 5000);
    }
  }

  // 8. 确保页面完全加载后执行
  if (document.readyState === 'complete') {
    initPlugin();
  } else {
    window.addEventListener('load', initPlugin);
  }
})();
