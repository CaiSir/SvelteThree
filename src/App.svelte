<script lang="ts">
  // import Header from './UI/components/Header.svelte'
  // import Navigation from './UI/components/Navigation.svelte'
  // import Sidebar from './UI/components/Sidebar.svelte'
  // import Footer from './UI/components/Footer.svelte'
  import ButtonPerformanceTest from './UI/components/ButtonPerformanceTest.svelte'
  import { onMount } from 'svelte'
  import { WorkerRendererService } from './Services/Worker/WorkerRendererService'

  let canvasContainer: HTMLDivElement
  let renderMode: 'worker' | 'main' = 'main'
  let workerRenderer: WorkerRendererService
  let currentView: 'three' | 'buttons' = 'three'

  onMount(() => {
    console.log('Component mounted, initializing Three.js...')
    
    // 延迟初始化，确保DOM完全准备好
    setTimeout(() => {
      const cleanup = initRenderer()
      return cleanup
    }, 100)
  })

  async function initRenderer() {
    console.log('Initializing renderer...')
    
    // 检查容器是否存在
    if (!canvasContainer) {
      console.error('Canvas container not found!')
      return () => {}
    }
    
    console.log('Container found:', canvasContainer)
    console.log('Container dimensions:', canvasContainer.clientWidth, canvasContainer.clientHeight)
    
    // 创建canvas元素
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvasContainer.appendChild(canvas)
    
    console.log('Canvas created and appended to container')
    
    // 创建Worker渲染服务
    workerRenderer = new WorkerRendererService()
    
    // 尝试使用Worker渲染
    const workerSuccess = await workerRenderer.init(canvas)
    
    if (workerSuccess) {
      renderMode = 'worker'
      console.log('Using Worker-based rendering')
      
      // 处理窗口大小变化
      function handleResize() {
        const width = canvasContainer.clientWidth || 800
        const height = canvasContainer.clientHeight || 600
        workerRenderer.resize(width, height)
      }
      
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        workerRenderer.cleanup()
        if (canvasContainer && canvas) {
          canvasContainer.removeChild(canvas)
        }
      }
    } else {
      // 降级到主线程渲染
      renderMode = 'main'
      console.log('Using main thread rendering (fallback)')
      return () => {
        if (canvasContainer && canvas) {
          canvasContainer.removeChild(canvas)
        }
      }
    }
  }

</script>

<main>  
  <div class="view-switcher">
    <button 
      class="switch-btn" 
      class:active={currentView === 'buttons'}
      on:click={() => currentView = 'buttons'}
    >
      性能测试 (10000按钮)
    </button>
    <button 
      class="switch-btn" 
      class:active={currentView === 'three'}
      on:click={() => currentView = 'three'}
    >
      Three.js 渲染
    </button>
  </div>

  {#if currentView === 'buttons'}
    <ButtonPerformanceTest />
  {:else}
    <div class="three-container">
      <div class="render-info">
        <h2>Three.js 渲染演示</h2>
        <p>当前渲染模式: <span class="render-mode">{renderMode === 'worker' ? 'Web Worker (高性能)' : '主线程 (兼容模式)'}</span></p>
        <p>状态: <span id="status">初始化中...</span></p>
      </div>
      <div bind:this={canvasContainer} class="canvas-wrapper"></div>
    </div>
  {/if}
</main>

<style>
  .view-switcher {
    display: flex;
    gap: 10px;
    padding: 20px;
    border-bottom: 2px solid #eee;
    background: #f9f9f9;
  }
  
  .switch-btn {
    padding: 12px 24px;
    border: 2px solid #667eea;
    background: white;
    color: #667eea;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .switch-btn:hover {
    background: #667eea;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
  }
  
  .switch-btn.active {
    background: #667eea;
    color: white;
  }

  .three-container {
    margin: 20px;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
  }

  .render-info {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f5f5f5;
    border-radius: 8px;
  }

  .render-mode {
    font-weight: bold;
    color: #007acc;
  }

  .canvas-wrapper {
    width: 800px;
    height: 600px;
    border: 2px solid #333;
    background-color: #f0f0f0;
  }

  h2 {
    margin-bottom: 15px;
    color: #333;
  }

  p {
    margin: 5px 0;
    color: #666;
  }
</style>