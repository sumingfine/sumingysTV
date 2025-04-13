// 密码保护功能
// 使用哈希值存储密码 - 这是"123456"的SHA-256哈希值
const PASSWORD_HASH = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";

// 计算字符串的SHA-256哈希值
async function sha256(message) {
    // 将字符串编码为UTF-8字节数组
    const msgBuffer = new TextEncoder().encode(message);
    // 使用SubtleCrypto API计算哈希值
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    // 将哈希值转换为十六进制字符串
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// 检查是否已经验证过密码
function isPasswordVerified() {
    return localStorage.getItem('password_verified') === 'true';
}

// 创建密码验证窗口
function createPasswordOverlay() {
    // 防止页面内容加载和显示
    document.documentElement.style.visibility = 'hidden';
    
    const overlay = document.createElement('div');
    overlay.id = 'password-overlay';
    overlay.style.visibility = 'visible';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    overlay.style.zIndex = '9999999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    
    const container = document.createElement('div');
    container.className = 'password-container';
    container.style.backgroundColor = '#111';
    container.style.border = '1px solid #333';
    container.style.borderRadius = '8px';
    container.style.padding = '2rem';
    container.style.width = '90%';
    container.style.maxWidth = '400px';
    container.style.textAlign = 'center';
    
    container.innerHTML = `
        <h2 style="margin-bottom: 1.5rem; background: linear-gradient(90deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold;">宿命影视</h2>
        <p style="margin-bottom: 1.5rem; color: #aaa;">请输入访问密码以继续</p>
        <input type="password" id="password-input" style="width: 100%; padding: 0.75rem 1rem; background-color: #222; border: 1px solid #333; color: white; border-radius: 0.5rem; margin-bottom: 1rem; outline: none; transition: border-color 0.3s;" placeholder="请输入密码..." autocomplete="off">
        <div>
            <button id="password-submit" style="background-color: white; color: black; font-weight: 500; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; transition: background-color 0.3s;">确认</button>
        </div>
        <p id="password-error" style="color: #ef4444; margin-top: 0.75rem; font-size: 0.875rem; display: none;">密码错误，请重试</p>
    `;
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // 防止页面滚动
    document.body.style.overflow = 'hidden';
    
    // 设置焦点到密码输入框
    setTimeout(() => {
        document.getElementById('password-input').focus();
    }, 100);
    
    // 添加事件监听器
    document.getElementById('password-submit').addEventListener('click', verifyPassword);
    document.getElementById('password-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            verifyPassword();
        }
    });
}

// 验证密码
async function verifyPassword() {
    const input = document.getElementById('password-input');
    const errorMsg = document.getElementById('password-error');
    
    // 计算输入密码的哈希值
    const inputHash = await sha256(input.value);
    
    if (inputHash === PASSWORD_HASH) {
        // 密码正确，记录到本地存储并移除密码窗口
        localStorage.setItem('password_verified', 'true');
        
        // 移除密码窗口
        document.getElementById('password-overlay').remove();
        
        // 恢复页面正常显示
        document.documentElement.style.visibility = 'visible';
        document.body.style.overflow = 'auto';
    } else {
        // 密码错误，显示错误消息
        errorMsg.style.display = 'block';
        input.value = '';
        input.focus();
        
        // 添加短暂的输入框抖动效果
        input.classList.add('shake');
        setTimeout(() => {
            input.classList.remove('shake');
        }, 500);
    }
}

// 监听页面加载并检查密码
document.addEventListener('DOMContentLoaded', function() {
    // 添加抖动效果的CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
        }
        .shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
    `;
    document.head.appendChild(style);
    
    // 检查是否已验证过密码
    if (!isPasswordVerified()) {
        // 如果未验证，创建密码窗口
        createPasswordOverlay();
    }
});

// 允许重置密码验证的函数 (仅用于开发测试)
function resetPasswordVerification() {
    localStorage.removeItem('password_verified');
    location.reload();
} 