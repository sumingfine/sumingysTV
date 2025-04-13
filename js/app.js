// 全局变量
let currentApiSource = localStorage.getItem('currentApiSource') || 'heimuer';
let customApiUrl = localStorage.getItem('customApiUrl') || '';
// 添加当前播放的集数索引
let currentEpisodeIndex = 0;
// 添加当前视频的所有集数
let currentEpisodes = [];
// 添加当前视频的标题
let currentVideoTitle = '';
// 新增全局变量用于倒序状态
let episodesReversed = false;

// 新增：解析多个自定义API源
let customApiUrls = [];
function parseCustomApiUrls() {
    if (!customApiUrl) return [];
    
    // 解析带有名称的API格式 "名称|URL"
    return customApiUrl.split(CUSTOM_API_CONFIG.separator)
        .map(item => {
            item = item.trim();
            if (!item) return null;
            
            // 检查是否包含名称分隔符
            if (item.includes(CUSTOM_API_CONFIG.nameSeparator)) {
                // 分离名称和URL
                const [name, url] = item.split(CUSTOM_API_CONFIG.nameSeparator, 2);
                if (name && url && url.trim().length > 0) {
                    return {
                        name: name.trim(),
                        url: url.trim()
                    };
                }
            }
            
            // 如果没有名称分隔符，则只有URL
            if (/^https?:\/\/.+/.test(item)) {
                return {
                    name: `${CUSTOM_API_CONFIG.namePrefix}${Math.floor(Math.random() * 1000)}`,
                    url: item
                };
            }
            
            return null;
        })
        .filter(item => item !== null)
        .slice(0, CUSTOM_API_CONFIG.maxSources);
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化时检查是否使用自定义接口
    if (currentApiSource === 'custom') {
        document.getElementById('customApiInput').classList.remove('hidden');
        document.getElementById('customApiUrl').value = customApiUrl;
        customApiUrls = parseCustomApiUrls();
    }

    // 设置 select 的默认选中值
    document.getElementById('apiSource').value = currentApiSource;

    // 初始化显示当前站点代码
    document.getElementById('currentCode').textContent = currentApiSource;
    
    // 初始化显示当前站点状态（使用优化后的测试函数）
    updateSiteStatusWithTest(currentApiSource);
    
    // 渲染搜索历史
    renderSearchHistory();
    
    // 设置黄色内容过滤开关初始状态
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    if (yellowFilterToggle) {
        yellowFilterToggle.checked = localStorage.getItem('yellowFilterEnabled') === 'true';
    }
    
    // 设置广告过滤开关初始状态
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (adFilterToggle) {
        adFilterToggle.checked = localStorage.getItem(PLAYER_CONFIG.adFilteringStorage) !== 'false'; // 默认为true
    }
    
    // 设置事件监听器
    setupEventListeners();
    
    // 新增：加载首页随机电影电视剧推荐
    fetchRandomMovies();
});

// 新增：获取随机电影电视剧函数
async function fetchRandomMovies() {
    try {
        // 使用现有API随机搜索热门关键词
        const keywords = ['电影', '电视剧', '动作', '科幻', '喜剧', '爱情', '动漫'];
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
        
        // 构建搜索URL，使用当前选择的API源
        let searchUrl = `/api/search?wd=${encodeURIComponent(randomKeyword)}&source=${currentApiSource}`;
        
        // 如果是自定义源，添加自定义API参数
        if (currentApiSource === 'custom' && customApiUrl) {
            searchUrl += `&customApi=${encodeURIComponent(customApiUrl)}`;
            if (customApiUrls.length > 1) {
                searchUrl += '&multipleApis=true';
            }
        }
        
        const response = await fetch(searchUrl);
        
        if (!response.ok) {
            throw new Error('获取随机电影失败');
        }
        
        const data = await response.json();
        
        // 如果有搜索结果，展示在界面上
        if (data.list && data.list.length > 0) {
            // 随机打乱结果并取前12个
            const shuffledResults = data.list.sort(() => 0.5 - Math.random()).slice(0, 12);
            displayRandomMovies(shuffledResults);
        }
    } catch (error) {
        console.error('获取随机电影出错:', error);
    }
}

// 新增：展示随机电影电视剧函数
function displayRandomMovies(movies) {
    const randomMoviesArea = document.getElementById('randomMoviesArea');
    
    // 如果不存在该区域，则返回
    if (!randomMoviesArea) return;
    
    // 显示区域
    randomMoviesArea.classList.remove('hidden');
    
    // 获取结果容器
    const resultsContainer = document.getElementById('randomMovies');
    resultsContainer.innerHTML = '';
    
    // 遍历显示电影
    movies.forEach(movie => {
        // 过滤成人内容
        if (localStorage.getItem('yellowFilterEnabled') === 'true' && 
            (movie.type_name && (movie.type_name.includes('伦理片') || movie.type_name.includes('色情')))) {
            return;
        }
        
        // 创建电影卡片
        const card = document.createElement('div');
        card.className = 'bg-[#111] border border-[#333] rounded-lg overflow-hidden hover:border-white transition-colors cursor-pointer';
        card.onclick = () => showDetails(movie.vod_id, movie.vod_name, movie.source_code);
        
        // 设置卡片内容
        const safeImgUrl = movie.vod_pic && movie.vod_pic.startsWith('http') ? movie.vod_pic : 'https://placehold.co/300x450/1f1f1f/white?text=无封面';
        
        card.innerHTML = `
            <div class="relative pb-[140%]">
                <img src="${safeImgUrl}" alt="${movie.vod_name}" class="absolute top-0 left-0 w-full h-full object-cover">
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                    <h3 class="text-white text-sm font-medium truncate">${movie.vod_name}</h3>
                    <p class="text-gray-400 text-xs">${movie.type_name || '未知分类'}</p>
                </div>
                ${movie.source_name ? `<div class="absolute top-2 right-2 bg-[#222] px-2 py-1 rounded text-xs text-white">${movie.source_name}</div>` : ''}
            </div>
        `;
        
        resultsContainer.appendChild(card);
    });
}

// 带有超时和缓存的站点可用性测试
async function updateSiteStatusWithTest(source) {
    // 显示加载状态
    document.getElementById('siteStatus').innerHTML = '<span class="text-gray-500">●</span> 测试中...';
    
    // 自定义API源特殊处理 - 测试所有提供的API
    if (source === 'custom') {
        const urls = parseCustomApiUrls();
        if (urls.length === 0) {
            updateSiteStatus(false);
            document.getElementById('siteStatus').innerHTML = '<span class="text-gray-500">●</span> 未设置API';
            return;
        }
        
        // 测试所有API并返回可用的数量
        const results = await Promise.all(
            urls.map(url => testCustomApiUrl(url))
        );
        
        const availableCount = results.filter(r => r).length;
        if (availableCount > 0) {
            updateSiteStatus(true);
            document.getElementById('siteStatus').innerHTML = 
                `<span class="text-green-500">●</span> ${availableCount}/${urls.length} 可用`;
        } else {
            updateSiteStatus(false);
            document.getElementById('siteStatus').innerHTML = 
                `<span class="text-red-500">●</span> 全部不可用`;
        }
        return;
    }
    
    // 检查缓存中是否有有效的测试结果
    const cacheKey = `siteStatus_${source}_${customApiUrl || ''}`;
    const cachedResult = localStorage.getItem(cacheKey);
    
    if (cachedResult) {
        try {
            const { isAvailable, timestamp } = JSON.parse(cachedResult);
            // 缓存有效期为2个月
            if (Date.now() - timestamp < 5184000000) {
                updateSiteStatus(isAvailable);
                return;
            }
        } catch (e) {
            // 忽略解析错误，继续测试
            console.error('缓存数据解析错误:', e);
        }
    }
    
    // 使用 Promise.race 添加超时处理
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('测试超时')), 8000)
        );
        
        const testPromise = testSiteAvailability(source);
        const isAvailable = await Promise.race([testPromise, timeoutPromise]);
        
        // 更新UI状态
        updateSiteStatus(isAvailable);
        
        // 缓存测试结果
        localStorage.setItem(cacheKey, JSON.stringify({
            isAvailable,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('站点测试错误:', error);
        updateSiteStatus(false);
    }
}

// 新增：测试单个自定义API URL
async function testCustomApiUrl(apiItem) {
    if (!apiItem) return false;
    
    // 如果是对象，提取URL，否则直接使用
    const url = typeof apiItem === 'object' ? apiItem.url : apiItem;
    
    if (!url) return false;
    
    // 验证URL格式
    if (CUSTOM_API_CONFIG.validateUrl && !/^https?:\/\/.+/.test(url)) {
        return false;
    }
    
    // 检查缓存
    if (CUSTOM_API_CONFIG.cacheResults) {
        const cacheKey = `api_test_${url}`;
        const cachedResult = localStorage.getItem(cacheKey);
        if (cachedResult) {
            try {
                const { isAvailable, timestamp } = JSON.parse(cachedResult);
                if (Date.now() - timestamp < CUSTOM_API_CONFIG.cacheExpiry) {
                    return isAvailable;
                }
            } catch (e) {
                console.error('缓存解析错误:', e);
            }
        }
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(), 
            CUSTOM_API_CONFIG.testTimeout
        );
        
        // 使用wd=test为参数进行简单搜索测试
        const response = await fetch('/api/search?wd=test&customApi=' + encodeURIComponent(url), {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const result = response.ok;
        
        // 缓存结果
        if (CUSTOM_API_CONFIG.cacheResults) {
            localStorage.setItem(`api_test_${url}`, JSON.stringify({
                isAvailable: result,
                timestamp: Date.now()
            }));
        }
        
        return result;
    } catch (e) {
        console.error(`自定义API测试失败(${url}):`, e);
        return false;
    }
}

// 设置事件监听器
function setupEventListeners() {
    // API源选择变更事件
    document.getElementById('apiSource').addEventListener('change', async function(e) {
        currentApiSource = e.target.value;
        const customApiInput = document.getElementById('customApiInput');
        
        if (currentApiSource === 'custom') {
            customApiInput.classList.remove('hidden');
            customApiUrl = document.getElementById('customApiUrl').value;
            localStorage.setItem('customApiUrl', customApiUrl);
            customApiUrls = parseCustomApiUrls();
            // 自定义接口不立即测试可用性
            document.getElementById('siteStatus').innerHTML = '<span class="text-gray-500">●</span> 待测试';
        } else {
            customApiInput.classList.add('hidden');
            // 非自定义接口立即测试可用性
            showToast('正在测试站点可用性...', 'info');
            updateSiteStatusWithTest(currentApiSource);
        }
        
        localStorage.setItem('currentApiSource', currentApiSource);
        document.getElementById('currentCode').textContent = currentApiSource;
        
        // 清理搜索结果并重置搜索区域
        resetSearchArea();
    });

    // 自定义接口输入框事件 - 更新为支持多个API
    document.getElementById('customApiUrl').addEventListener('blur', async function(e) {
        customApiUrl = e.target.value;
        localStorage.setItem('customApiUrl', customApiUrl);
        
        if (currentApiSource === 'custom' && customApiUrl) {
            showToast('正在测试API可用性...', 'info');
            customApiUrls = parseCustomApiUrls();
            
            // 测试所有配置的API
            if (customApiUrls.length > 0) {
                updateSiteStatusWithTest('custom');
            } else {
                document.getElementById('siteStatus').innerHTML = 
                    '<span class="text-gray-500">●</span> 未设置API';
                showToast('请输入至少一个有效的API地址', 'warning');
            }
        }
    });

    // 回车搜索
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            search();
        }
    });

    // 点击外部关闭设置面板
    document.addEventListener('click', function(e) {
        const panel = document.getElementById('settingsPanel');
        const settingsButton = document.querySelector('button[onclick="toggleSettings(event)"]');
        
        if (!panel.contains(e.target) && !settingsButton.contains(e.target) && panel.classList.contains('show')) {
            panel.classList.remove('show');
        }
    });
    
    // 新增：黄色内容过滤开关事件绑定
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    if (yellowFilterToggle) {
        yellowFilterToggle.addEventListener('change', function(e) {
            localStorage.setItem('yellowFilterEnabled', e.target.checked);
        });
    }
    
    // 新增：广告过滤开关事件绑定
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (adFilterToggle) {
        adFilterToggle.addEventListener('change', function(e) {
            localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, e.target.checked);
        });
    }
}

// 重置搜索区域
function resetSearchArea() {
    // 清理搜索结果
    document.getElementById('results').innerHTML = '';
    document.getElementById('searchInput').value = '';
    
    // 恢复搜索区域的样式
    document.getElementById('searchArea').classList.add('flex-1');
    document.getElementById('searchArea').classList.remove('mb-8');
    document.getElementById('resultsArea').classList.add('hidden');
    
    // 显示随机电影区域
    const randomMoviesArea = document.getElementById('randomMoviesArea');
    if (randomMoviesArea && !randomMoviesArea.classList.contains('hidden')) {
        randomMoviesArea.classList.remove('hidden');
    } else {
        // 如果随机电影区域是隐藏的，获取随机电影数据
        fetchRandomMovies();
    }
    
    // 确保页脚正确显示，移除相对定位
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.style.position = '';
    }
}

// 搜索功能
async function search() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        showToast('请输入搜索内容', 'info');
        return;
    }
    
    showLoading();
    
    try {
        let apiParams;
        
        // 处理自定义API源
        if (currentApiSource === 'custom') {
            // 获取可能包含多个API的字符串
            customApiUrl = document.getElementById('customApiUrl').value.trim();
            localStorage.setItem('customApiUrl', customApiUrl);
            
            if (!customApiUrl) {
                showToast('请先设置自定义API地址', 'warning');
                hideLoading();
                return;
            }
            
            // 解析自定义API（可能包含名称）
            customApiUrls = parseCustomApiUrls();
            
            if (customApiUrls.length === 0) {
                showToast('没有有效的自定义API地址', 'warning');
                hideLoading();
                return;
            }
            
            // 准备API参数 - 需要把对象转回字符串格式
            const apiString = customApiUrls.map(item => {
                if (typeof item === 'object' && item.url) {
                    // 如果有名称，则以名称|URL的形式传递
                    if (item.name) {
                        return `${item.name}${CUSTOM_API_CONFIG.nameSeparator}${item.url}`;
                    }
                    return item.url;
                }
                return item;
            }).join(CUSTOM_API_CONFIG.separator);
            
            // 检查是否有多个API
            if (customApiUrls.length > 1) {
                apiParams = '&customApi=' + encodeURIComponent(apiString) + '&source=custom&multipleApis=true';
            } else {
                // 单个API也保留名称信息
                apiParams = '&customApi=' + encodeURIComponent(apiString) + '&source=custom';
            }
        } else {
            apiParams = '&source=' + currentApiSource;
        }
        
        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('/api/search?wd=' + encodeURIComponent(query) + apiParams, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.code === 400) {
            showToast(data.msg || '搜索失败，请检查网络连接或更换数据源', 'error');
            hideLoading();
            return;
        }
        
        // 保存搜索历史
        saveSearchHistory(query);
        
        // 处理搜索结果过滤：如果启用了黄色内容过滤，则过滤掉分类含有"伦理片"或"色情片"的项目
        const yellowFilterEnabled = localStorage.getItem('yellowFilterEnabled') === 'true';
        let results = data.list;
        if (yellowFilterEnabled) {
            const banned = ['伦理片', '色情片','福利视频','福利片'];
            results = results.filter(item => {
                const typeName = item.type_name || '';
                return !banned.some(keyword => typeName.includes(keyword));
            });
        }
        
        // 显示结果区域，调整搜索区域
        document.getElementById('searchArea').classList.remove('flex-1');
        document.getElementById('searchArea').classList.add('mb-8');
        document.getElementById('resultsArea').classList.remove('hidden');
        
        // 隐藏随机电影区域
        const randomMoviesArea = document.getElementById('randomMoviesArea');
        if (randomMoviesArea) {
            randomMoviesArea.classList.add('hidden');
        }
        
        const resultsDiv = document.getElementById('results');
        
        // 如果没有结果
        if (!results || results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-2 text-lg font-medium text-gray-400">没有找到匹配的结果</h3>
                    <p class="mt-1 text-sm text-gray-500">请尝试其他关键词或更换数据源</p>
                </div>
            `;
            hideLoading();
            return;
        }

        // 添加XSS保护，使用textContent和属性转义
        resultsDiv.innerHTML = results.map(item => {
            const safeId = item.vod_id ? item.vod_id.toString().replace(/[^\w-]/g, '') : '';
            const safeName = (item.vod_name || '').toString()
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            const sourceInfo = item.source_name ? 
                `<span class="bg-[#222] text-xs px-2 py-1 rounded-full">${item.source_name}</span>` : '';
            const sourceCode = item.source_code || currentApiSource;
            
            // 添加API URL属性，用于详情获取
            let apiUrlAttr = '';
            if (item.api_url) {
                // 如果是自定义源，确保保存完整的名称|URL格式
                if (sourceCode === 'custom' && item.source_name && item.source_name !== '自定义源') {
                    const safeApiUrl = (item.source_name + CUSTOM_API_CONFIG.nameSeparator + item.api_url).replace(/"/g, '&quot;');
                    apiUrlAttr = `data-api-url="${safeApiUrl}"`;
                } else {
                    apiUrlAttr = `data-api-url="${item.api_url.replace(/"/g, '&quot;')}"`;
                }
            }
            
            // 重新设计的卡片布局 - 支持更好的封面图显示
            const hasCover = item.vod_pic && item.vod_pic.startsWith('http');
            
            // 不同的布局设计 - 桌面端使用横向布局，减小卡片尺寸
            return `
                <div class="card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] h-full" 
                     onclick="showDetails('${safeId}','${safeName}','${sourceCode}')" ${apiUrlAttr}>
                    <div class="md:flex">
                        <!-- 封面图区域 - 调整高度更紧凑 -->
                        ${hasCover ? `
                        <div class="md:w-1/4 relative overflow-hidden">
                            <div class="w-full h-40 md:h-full">
                                <img src="${item.vod_pic}" alt="${safeName}" 
                                     class="w-full h-full object-cover transition-transform hover:scale-110" 
                                     onerror="this.onerror=null; this.src='https://via.placeholder.com/300x450?text=无封面'; this.classList.add('object-contain');" 
                                     loading="lazy">
                                <div class="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent opacity-60"></div>
                            </div>
                        </div>` : ''}
                        
                        <!-- 内容区域 - 减小内边距 -->
                        <div class="p-3 flex flex-col flex-grow ${hasCover ? 'md:w-3/4' : 'w-full'}">
                            <div class="flex-grow">
                                <h3 class="text-lg font-semibold mb-2 line-clamp-2">${safeName}</h3>
                                
                                <!-- 添加影片元数据 - 使用原始彩色标签样式，但减小间距 -->
                                <div class="flex flex-wrap gap-1 mb-2">
                                    ${(item.type_name || '').toString().replace(/</g, '&lt;') ? 
                                      `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-blue-500 text-blue-300">
                                          ${(item.type_name || '').toString().replace(/</g, '&lt;')}
                                      </span>` : ''}
                                    ${(item.vod_year || '') ? 
                                      `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-purple-500 text-purple-300">
                                          ${item.vod_year}
                                      </span>` : ''}
                                </div>
                                <p class="text-gray-400 text-xs line-clamp-2">
                                    ${(item.vod_remarks || '暂无介绍').toString().replace(/</g, '&lt;')}
                                </p>
                            </div>
                            
                            <!-- 底部元信息区域 - 减小上边距 -->
                            <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-800">
                                ${sourceInfo ? `<div>${sourceInfo}</div>` : '<div></div>'}
                                <div>
                                    <span class="text-xs text-gray-500 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        点击播放
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('搜索错误:', error);
        if (error.name === 'AbortError') {
            showToast('搜索请求超时，请检查网络连接', 'error');
        } else {
            showToast('搜索请求失败，请稍后重试', 'error');
        }
    } finally {
        hideLoading();
    }
}

// 显示详情 - 修改函数接受sourceCode参数和API URL
async function showDetails(id, vod_name, sourceCode = currentApiSource) {
    if (!id) {
        showToast('视频ID无效', 'error');
        return;
    }
    
    showLoading();
    try {
        // 构建API参数
        let apiParams = '';
        
        // 处理自定义API源 - 如果有api_url参数，优先使用
        if (sourceCode === 'custom') {
            // 查找结果中包含api_url的项目
            const apiUrl = event.currentTarget?.getAttribute('data-api-url');
            
            if (apiUrl) {
                // 检查URL是否包含名称分隔符（可能是保存在DOM元素中的完整名称|URL格式）
                apiParams = '&customApi=' + encodeURIComponent(apiUrl);
            } else {
                // 回退到使用第一个可用的自定义API
                const customApis = parseCustomApiUrls();
                if (customApis.length > 0) {
                    // 构建完整的名称|URL格式字符串
                    const firstApi = customApis[0];
                    let apiString;
                    
                    if (typeof firstApi === 'object') {
                        if (firstApi.name && firstApi.url) {
                            apiString = `${firstApi.name}${CUSTOM_API_CONFIG.nameSeparator}${firstApi.url}`;
                        } else {
                            apiString = firstApi.url || '';
                        }
                    } else {
                        apiString = firstApi;
                    }
                    
                    apiParams = '&customApi=' + encodeURIComponent(apiString);
                } else {
                    showToast('无可用的自定义API', 'error');
                    hideLoading();
                    return;
                }
            }
            
            apiParams += '&source=custom';
        } else {
            apiParams = '&source=' + sourceCode;
        }
        
        const response = await fetch('/api/detail?id=' + encodeURIComponent(id) + apiParams);
        
        const data = await response.json();
        
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        // 显示来源信息
        const sourceName = data.videoInfo && data.videoInfo.source_name ? 
            ` <span class="text-sm font-normal text-gray-400">(${data.videoInfo.source_name})</span>` : '';
        
        modalTitle.innerHTML = (vod_name || '未知视频') + sourceName;
        currentVideoTitle = vod_name || '未知视频';
        
        // 保存当前源码以便后续操作
        currentApiSource = sourceCode;
        
        if (data.episodes && data.episodes.length > 0) {
            // 安全处理集数URL
            const safeEpisodes = data.episodes.map(url => {
                try {
                    // 确保URL是有效的并且是http或https开头
                    return url && (url.startsWith('http://') || url.startsWith('https://'))
                        ? url.replace(/"/g, '&quot;')
                        : '';
                } catch (e) {
                    return '';
                }
            }).filter(url => url); // 过滤掉空URL
            
            // 保存当前视频的所有集数
            currentEpisodes = safeEpisodes;
            episodesReversed = false; // 默认正序
            modalContent.innerHTML = `
                <div class="flex justify-end mb-2">
                    <button onclick="toggleEpisodeOrder()" class="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
                        </svg>
                        <span>倒序排列</span>
                    </button>
                </div>
                <div id="episodesGrid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    ${renderEpisodes(vod_name)}
                </div>
            `;
        } else {
            modalContent.innerHTML = '<p class="text-center text-gray-400 py-8">没有找到可播放的视频</p>';
        }
        
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('获取详情错误:', error);
        if (error.name === 'AbortError') {
            showToast('获取详情超时，请检查网络连接', 'error');
        } else {
            showToast('获取详情失败，请稍后重试', 'error');
        }
    } finally {
        hideLoading();
    }
}

// 更新播放视频函数，修改为在新标签页中打开播放页面
function playVideo(url, vod_name, episodeIndex = 0) {
    if (!url) {
        showToast('无效的视频链接', 'error');
        return;
    }
    
    // 保存当前状态到localStorage，让播放页面可以获取
    localStorage.setItem('currentVideoTitle', currentVideoTitle);
    localStorage.setItem('currentEpisodeIndex', episodeIndex);
    localStorage.setItem('currentEpisodes', JSON.stringify(currentEpisodes));
    localStorage.setItem('episodesReversed', episodesReversed);
    
    // 构建播放页面URL，传递必要参数
    const playerUrl = `player.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(vod_name)}&index=${episodeIndex}`;
    
    // 在新标签页中打开播放页面
    window.open(playerUrl, '_blank');
}

// 播放上一集
function playPreviousEpisode() {
    if (currentEpisodeIndex > 0) {
        const prevIndex = currentEpisodeIndex - 1;
        const prevUrl = currentEpisodes[prevIndex];
        playVideo(prevUrl, currentVideoTitle, prevIndex);
    }
}

// 播放下一集
function playNextEpisode() {
    if (currentEpisodeIndex < currentEpisodes.length - 1) {
        const nextIndex = currentEpisodeIndex + 1;
        const nextUrl = currentEpisodes[nextIndex];
        playVideo(nextUrl, currentVideoTitle, nextIndex);
    }
}

// 处理播放器加载错误
function handlePlayerError() {
    hideLoading();
    showToast('视频播放加载失败，请尝试其他视频源', 'error');
}

// 新增辅助函数用于渲染剧集按钮（使用当前的排序状态）
function renderEpisodes(vodName) {
    const episodes = episodesReversed ? [...currentEpisodes].reverse() : currentEpisodes;
    return episodes.map((episode, index) => {
        // 根据倒序状态计算真实的剧集索引
        const realIndex = episodesReversed ? currentEpisodes.length - 1 - index : index;
        return `
            <button id="episode-${realIndex}" onclick="playVideo('${episode}','${vodName.replace(/"/g, '&quot;')}', ${realIndex})" 
                    class="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg transition-colors text-center episode-btn">
                第${realIndex + 1}集
            </button>
        `;
    }).join('');
}

// 新增切换排序状态的函数
function toggleEpisodeOrder() {
    episodesReversed = !episodesReversed;
    // 重新渲染剧集区域，使用 currentVideoTitle 作为视频标题
    const episodesGrid = document.getElementById('episodesGrid');
    if (episodesGrid) {
        episodesGrid.innerHTML = renderEpisodes(currentVideoTitle);
    }
    
    // 更新按钮文本和箭头方向
    const toggleBtn = document.querySelector('button[onclick="toggleEpisodeOrder()"]');
    if (toggleBtn) {
        toggleBtn.querySelector('span').textContent = episodesReversed ? '正序排列' : '倒序排列';
        const arrowIcon = toggleBtn.querySelector('svg');
        if (arrowIcon) {
            arrowIcon.style.transform = episodesReversed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}
