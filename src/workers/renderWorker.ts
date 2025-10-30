// Web Worker for Three.js rendering
// Worker只负责计算状态数据，不创建Three.js对象
// 主线程负责创建Mesh并渲染

interface WorkerMessage {
  type: 'init' | 'resize' | 'cleanup' | 'createMesh';
  data?: any;
}

interface InitData {
  width: number;
  height: number;
}

interface CubeState {
  rotation: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
}

// Mesh创建指令（在Worker中定义，主线程执行）
interface MeshCreateCommand {
  id: string;
  geometry: {
    type: 'box' | 'sphere' | 'plane';
    params: {
      width?: number;
      height?: number;
      depth?: number;
      radius?: number;
      widthSegments?: number;
      heightSegments?: number;
    };
  };
  material: {
    type: 'basic' | 'standard' | 'lambert';
    color?: number;
    params?: any;
  };
  initialTransform?: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  };
}

class ThreeWorkerRenderer {
  private cubeState: CubeState = {
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
  };
  private animationId: number | null = null;
  private lastTime: number = 0;

  init(data: InitData) {
    console.log('Worker: Initializing with dimensions:', data.width, data.height);
    
    // Worker中定义Mesh的创建指令（逻辑在这里，执行在主线程）
    const cubeMeshCommand: MeshCreateCommand = {
      id: 'cube-1',
      geometry: {
        type: 'box',
        params: {
          width: 1,
          height: 1,
          depth: 1,
        },
      },
      material: {
        type: 'basic',
        color: 0xff0000, // 红色
      },
      initialTransform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0},
        scale: { x: 1, y: 1, z: 1 },
      },
    };

    // 同步cubeState到初始变换（确保状态和初始变换一致）
    // if (cubeMeshCommand.initialTransform) {
    //   if (cubeMeshCommand.initialTransform.rotation) {
    //     this.cubeState.rotation = { ...cubeMeshCommand.initialTransform.rotation };
    //   }
    //   if (cubeMeshCommand.initialTransform.position) {
    //     this.cubeState.position = { ...cubeMeshCommand.initialTransform.position };
    //   }
    // }

    // 发送创建指令到主线程，让主线程创建实际的Three.js对象
    self.postMessage({
      type: 'createMesh',
      data: cubeMeshCommand,
    });

    // 延迟发送初始状态，确保Mesh先创建完成
    setTimeout(() => {
//      this.updateRenderData();
    }, 10);
    
    // 通知主线程初始化完成，然后开始动画循环
    self.postMessage({ type: 'initComplete' });
    
    // 启动动画循环（在Worker中只计算状态数据）
    // this.startAnimation();
  }

  resize(_width: number, _height: number) {
    // Worker中不需要处理resize，只负责计算状态
    // 相机和渲染器在主线程管理
  }

  private updateRenderData() {
    // 将Worker中计算的状态数据发送到主线程
    // 主线程会使用这些数据更新实际的Three.js Mesh
    self.postMessage({
      type: 'renderData',
      data: {
        meshId: 'cube-1', // 指定要更新的Mesh ID
        rotation: { ...this.cubeState.rotation },
        position: { ...this.cubeState.position },
      },
    });
  }

  private startAnimation() {
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;
    
    const animate = () => {
      // 在Worker中没有requestAnimationFrame，使用setTimeout模拟
      this.animationId = setTimeout(() => {
        const now = performance.now();
        
        // 计算时间差，实现平滑动画
        const deltaTime = this.lastTime ? (now - this.lastTime) / 1000 : 0;
        this.lastTime = now;
        
        // 在Worker线程中计算状态（旋转、位置等数值）
        // 这里只计算数据，不操作Three.js对象
        const rotationSpeed = 1.0; // 弧度/秒
        this.cubeState.rotation.x += rotationSpeed * deltaTime;
        this.cubeState.rotation.y += rotationSpeed * deltaTime;

        // 将更新后的状态发送到主线程，主线程会用这些数据更新实际的Mesh
        this.updateRenderData();
        
        // 继续下一帧
        animate();
      }, frameInterval) as any;
    };

    this.lastTime = performance.now();
    animate();
  }

  cleanup() {
    if (this.animationId) {
      clearTimeout(this.animationId);
      this.animationId = null;
    }
  }
}

// Worker实例
const renderer = new ThreeWorkerRenderer();

// 监听主线程消息
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      renderer.init(data as InitData);
      break;
    case 'resize':
      renderer.resize(data.width, data.height);
      break;
    case 'cleanup':
      renderer.cleanup();
      break;
  }
});

// 导出类型供主线程使用
export type { WorkerMessage, InitData, MeshCreateCommand };
