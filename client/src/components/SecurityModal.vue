<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal security-modal">
      <h3>🔒 {{ t('securityVerification') || '安全验证 / Security Verification' }}</h3>

      <!-- For private chats -->
      <template v-if="type === 'private'">
        <div class="security-emojis">
          {{ securityEmojis }}
        </div>

        <p class="emoji-description">
          {{ t('emojiDescription') || '如果你和对方看到的表情一样，说明聊天是安全的' }}
        </p>

        <div class="verify-steps">
          <div class="step">
            <span class="step-number">1</span>
            <span>{{ t('verifyStep1') || '面对面或通过电话联系对方' }}</span>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <span>{{ t('verifyStep2') || '比较双方屏幕上显示的表情' }}</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span>{{ t('verifyStep3') || '如果完全一致，说明没有人在窃听' }}</span>
          </div>
        </div>
      </template>

      <!-- For group chats -->
      <template v-else>
        <div class="group-security-info">
          <p>{{ t('groupSecurityInfo') || '群组使用对称加密，密钥由创建者生成并安全分发给成员' }}</p>
        </div>
      </template>

      <div class="divider"></div>

      <!-- How it works section -->
      <div class="how-it-works">
        <h4>{{ t('howItWorks') || '加密是如何保护你的？' }}</h4>

        <div class="feature">
          <span class="icon">🔐</span>
          <div>
            <strong>{{ t('e2eTitle') || '端对端加密' }}</strong>
            <p>{{ t('e2eDescription') || '消息在你的设备上加密，只有接收者能解密。服务器只能看到乱码。' }}</p>
          </div>
        </div>

        <div class="feature">
          <span class="icon">🔑</span>
          <div>
            <strong>{{ t('keyTitle') || '你的私钥' }}</strong>
            <p>{{ t('keyDescription') || '私钥用你的密码加密后存储，即使服务器被黑，没有你的密码也无法解密。' }}</p>
          </div>
        </div>

        <div class="feature">
          <span class="icon">🚫</span>
          <div>
            <strong>{{ t('noAccessTitle') || '我们无法查看' }}</strong>
            <p>{{ t('noAccessDescription') || '我们（服务器管理员）永远无法阅读你的消息内容。这是数学保证的。' }}</p>
          </div>
        </div>
      </div>

      <!-- Your key fingerprint -->
      <div class="fingerprint-section">
        <h4>{{ t('yourFingerprint') || '你的公钥指纹' }}</h4>
        <code class="fingerprint">{{ myFingerprint }}</code>
        <p class="fingerprint-note">{{ t('fingerprintNote') || '可以分享给别人用于验证身份' }}</p>
      </div>

      <button class="close-btn" @click="$emit('close')">{{ t('gotIt') || '知道了' }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/user.js'
import { useLanguageStore } from '../stores/language.js'
import { generateSecurityEmojis, generateKeyFingerprint } from '../utils/crypto.js'

const props = defineProps({
  type: {
    type: String,
    default: 'private' // 'private' or 'group'
  },
  partnerPublicKey: {
    type: String,
    default: ''
  }
})

defineEmits(['close'])

const userStore = useUserStore()
const langStore = useLanguageStore()
const t = computed(() => langStore.t)

const securityEmojis = computed(() => {
  if (props.type === 'private' && props.partnerPublicKey && userStore.user?.publicKey) {
    return generateSecurityEmojis(userStore.user.publicKey, props.partnerPublicKey)
  }
  return ''
})

const myFingerprint = computed(() => {
  if (userStore.user?.publicKey) {
    return generateKeyFingerprint(userStore.user.publicKey)
  }
  return ''
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.security-modal {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

h3 {
  margin: 0 0 1.5rem;
  text-align: center;
  font-size: 1.25rem;
}

h4 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.security-emojis {
  font-size: 2.5rem;
  text-align: center;
  letter-spacing: 0.25rem;
  padding: 1.5rem;
  background: var(--bg);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.emoji-description {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.verify-steps {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.group-security-info {
  padding: 1rem;
  background: var(--bg);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.group-security-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 1.5rem 0;
}

.how-it-works {
  margin-bottom: 1.5rem;
}

.feature {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.feature .icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.feature strong {
  display: block;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.feature p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.fingerprint-section {
  background: var(--bg);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.fingerprint {
  display: block;
  font-size: 0.7rem;
  word-break: break-all;
  padding: 0.5rem;
  background: var(--card-bg);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.fingerprint-note {
  margin: 0;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.close-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.close-btn:hover {
  opacity: 0.9;
}
</style>
