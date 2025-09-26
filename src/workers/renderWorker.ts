// Web Worker for Three.js rendering (simplified version)
import * as THREE from 'three';

interface WorkerMessage {
  type: 'init' | 'resize' | 'cleanup';
  data?: any;
}

interface InitData {
  width: number;
  height: number;
}

class ThreeWorkerRenderer {
  private scene: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private cube!: THREE.Mesh;
  private animationId: number | null = null;

  constructor() {
    this.scene = new THREE.Scene();
  }

  init(data: InitData) {
    const { width, height } = data;

    console.log('Worker: Initializing with dimensions:', width, height);

    // 创建相机
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    // 创建立方体
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    // 开始动画循环
    this.startAnimation();

    // 通知主线程初始化完成
    self.postMessage({ type: 'initComplete' });
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private startAnimation() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // 旋转立方体
      this.cube.rotation.x += 0.01;
      this.cube.rotation.y += 0.01;

      // 发送渲染数据到主线程
      self.postMessage({
        type: 'renderData',
        data: {
          rotation: {
            x: this.cube.rotation.x,
            y: this.cube.rotation.y,
          },
        },
      });
    };

    animate();
  }

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
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
export type { WorkerMessage, InitData };
