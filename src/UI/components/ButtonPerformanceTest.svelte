<script lang="ts">
  import { onMount } from 'svelte'
  
  let buttonCount = 10000
  let startTime: number
  let endTime: number
  let renderTime: number | null = null
  let mounted = false
  let domNodeCount: number | null = null
  let containerElement: HTMLDivElement
  let memoryInfo: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null = null
  
  interface MemoryInfo {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  
  interface ButtonState {
    id: number
    clicked: boolean
    clickCount: number
  }
  
  const buttons: ButtonState[] = []
  
  onMount(() => {
    mounted = true
    // 创建所有按钮状态
    for (let i = 0; i < buttonCount; i++) {
      buttons.push({
        id: i,
        clicked: false,
        clickCount: 0
      })
    }
    
    // 获取初始内存信息
    updateMemoryInfo()
    
    // 测量渲染时间
    startTime = performance.now()
    requestAnimationFrame(() => {
      endTime = performance.now()
      renderTime = endTime - startTime
      
      // 计算DOM节点数和内存
      updateDOMCount()
    })
  })
  
  function updateDOMCount() {
    if (containerElement) {
      // 只计算按钮容器内的DOM节点数
      const allNodes = containerElement.querySelectorAll('*')
      domNodeCount = allNodes.length + 1 // +1 是容器本身
    }
    updateMemoryInfo()
  }
  
  function updateMemoryInfo() {
    // 尝试获取内存信息（仅在支持的浏览器中可用）
    if ('memory' in performance) {
      const memory = (performance as any).memory
      memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }
  }
  
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }
  
  function handleClick(id: number) {
    const button = buttons[id]
    button.clicked = !button.clicked
    button.clickCount++
    updateDOMCount()
  }
</script>

<div class="performance-test">
  <div class="test-header">
    <h1>按钮性能测试</h1>
    <div class="stats">
      <div class="stat-item">
        <span class="label">按钮数量:</span>
        <span class="value">{buttonCount.toLocaleString()}</span>
      </div>
      <div class="stat-item" if={renderTime !== null}>
        <span class="label">初始渲染时间:</span>
        <span class="value">{renderTime?.toFixed(2)} ms</span>
      </div>
      <div class="stat-item" if={domNodeCount !== null}>
        <span class="label">DOM节点数:</span>
        <span class="value">{domNodeCount?.toLocaleString()}</span>
      </div>
      <div class="stat-item" if={memoryInfo !== null}>
        <span class="label">内存占用:</span>
        <span class="value">{formatBytes(memoryInfo?.usedJSHeapSize || 0)}</span>
      </div>
      <div class="stat-item" if={memoryInfo !== null}>
        <span class="label">堆限制:</span>
        <span class="value">{formatBytes(memoryInfo?.jsHeapSizeLimit || 0)}</span>
      </div>
      <div class="stat-item">
        <span class="label">总点击次数:</span>
        <span class="value">{buttons.reduce((sum, b) => sum + b.clickCount, 0)}</span>
      </div>
    </div>
  </div>
  
  <div class="button-container" bind:this={containerElement}>
    {#if mounted}
      {#each buttons as button}
        <button 
          class="test-button" 
          class:clicked={button.clicked}
          on:click={() => handleClick(button.id)}
        >
          <span class="button-id">#{button.id}</span>
          {#if button.clickCount > 0}
            <span class="click-count">({button.clickCount})</span>
          {/if}
        </button>
      {/each}
    {/if}
  </div>
</div>

<style>
  .performance-test {
    padding: 20px;
    max-width: 100%;
  }
  
  .test-header {
    margin-bottom: 20px;
    padding: 15px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    color: white;
  }
  
  h1 {
    margin: 0 0 15px 0;
    font-size: 24px;
  }
  
  .stats {
    display: flex;
    gap: 30px;
    flex-wrap: wrap;
  }
  
  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .label {
    font-size: 12px;
    opacity: 0.8;
  }
  
  .value {
    font-size: 20px;
    font-weight: bold;
  }
  
  .button-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
    max-height: 600px;
    overflow-y: auto;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 8px;
  }
  
  .test-button {
    padding: 8px 12px;
    border: 2px solid #667eea;
    background: white;
    color: #667eea;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-height: 50px;
    justify-content: center;
  }
  
  .test-button:hover {
    background: #667eea;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
  }
  
  .test-button.clicked {
    background: #764ba2;
    border-color: #764ba2;
    color: white;
  }
  
  .button-id {
    font-weight: bold;
  }
  
  .click-count {
    font-size: 10px;
    opacity: 0.8;
  }
</style>

