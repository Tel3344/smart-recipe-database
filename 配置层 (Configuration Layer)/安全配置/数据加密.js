// 数据加密模块
class DataEncryption {
  static encrypt(data, key) {
    // 使用Web Crypto API加密敏感数据
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    // 生成随机IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 使用AES-GCM加密
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataBuffer
    );
    
    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }
}
