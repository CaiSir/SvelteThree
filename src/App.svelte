<script lang="ts">
  import Header from './UI/components/Header.svelte'
  import Navigation from './UI/components/Navigation.svelte'
  import Sidebar from './UI/components/Sidebar.svelte'
  import Footer from './UI/components/Footer.svelte'
  import { onMount } from 'svelte'
  import * as THREE from 'three'
  import { WorkerRendererService } from './Services/Worker/WorkerRendererService'

  let canvasContainer: HTMLDivElement
  let renderMode: 'worker' | 'main' = 'main'
  let workerRenderer: WorkerRendererService

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
      return initMainThreadRenderer(canvas)
    }
  }

  function initMainThreadRenderer(canvas: HTMLCanvasElement) {
    console.log('Initializing main thread renderer...')
    
    // 设置canvas尺寸
    const width = 800
    const height = 600
    canvas.width = width
    canvas.height = height
    
    console.log('Canvas dimensions set to:', width, height)
    
    // 创建场景
    const scene = new THREE.Scene()
    console.log('Scene created')
    
    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    console.log('Camera created')
    
    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true 
    })
    renderer.setSize(width, height)
    renderer.setClearColor(0x87CEEB) // 天蓝色背景
    console.log('Renderer created')
    
    // 创建立方体几何体
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    console.log('Geometry created')
    
    // 创建材质
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    console.log('Material created')
    
    // 创建立方体网格
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)
    console.log('Cube created and added to scene')
    
    // 设置相机位置
    camera.position.z = 5
    console.log('Camera position set')
    
    // 动画循环
    function animate() {
      requestAnimationFrame(animate)
      
      // 旋转立方体
      cube.rotation.x += 0.01
      cube.rotation.y += 0.01
      
      // 渲染场景
      renderer.render(scene, camera)
    }
    
    console.log('Starting animation loop...')
    animate()
    
    // 处理窗口大小变化
    function handleResize() {
      const newWidth = canvasContainer.clientWidth || 800
      const newHeight = canvasContainer.clientHeight || 600
      
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }
    
    window.addEventListener('resize', handleResize)
    
    // 清理函数
    return () => {
      console.log('Cleaning up Three.js...')
      window.removeEventListener('resize', handleResize)
      if (canvasContainer && canvas) {
        canvasContainer.removeChild(canvas)
      }
    }
  }
</script>

<main>  
  <div class="three-container">
    <div class="render-info">
      <h2>Three.js 渲染演示</h2>
      <p>当前渲染模式: <span class="render-mode">{renderMode === 'worker' ? 'Web Worker (高性能)' : '主线程 (兼容模式)'}</span></p>
      <p>状态: <span id="status">初始化中...</span></p>
    </div>
    <div bind:this={canvasContainer} class="canvas-wrapper"></div>
  </div>
</main>

<style>
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