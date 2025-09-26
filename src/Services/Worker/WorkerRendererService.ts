import type { InitData } from '../../workers/renderWorker';
import * as THREE from 'three';

export class WorkerRendererService {
  private worker: Worker | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private cube: THREE.Mesh | null = null;
  private animationId: number | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): boolean {
    // 检查Web Workers支持
    this.isSupported = typeof Worker !== 'undefined';

    if (!this.isSupported) {
      console.warn(
        'Web Workers not supported, falling back to main thread rendering'
      );
    }

    return this.isSupported;
  }

  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      this.canvas = canvas;

      console.log(
        'Main: Canvas dimensions:',
        canvas.clientWidth,
        canvas.clientHeight
      );

      // 在主线程创建Three.js场景用于渲染
      this.initMainThreadThreeJS();

      // 创建Worker
      this.worker = new Worker(
        new URL('../../workers/renderWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // 设置消息监听
      this.setupMessageHandlers();

      // 发送初始化消息到Worker
      const initData: InitData = {
        width: canvas.clientWidth || 800,
        height: canvas.clientHeight || 600,
      };

      this.worker.postMessage({
        type: 'init',
        data: initData,
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize worker renderer:', error);
      return false;
    }
  }

  private setupMessageHandlers(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'initComplete':
          console.log('Worker renderer initialized successfully');
          break;
        case 'renderData':
          this.updateMainThreadRender(data);
          break;
        case 'error':
          console.error('Worker renderer error:', event.data.error);
          break;
      }
    };

    this.worker.onerror = error => {
      console.error('Worker error:', error);
    };
  }

  resize(width: number, height: number): void {
    if (this.worker) {
      this.worker.postMessage({
        type: 'resize',
        data: {
          width: width || 800,
          height: height || 600,
        },
      });
    }
  }

  private initMainThreadThreeJS(): void {
    if (!this.canvas) return;

    console.log('Main: Initializing Three.js scene in main thread');

    // 创建场景
    this.scene = new THREE.Scene();

    // 创建相机
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x87ceeb);

    // 创建立方体
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    console.log('Main: Three.js scene initialized successfully');
  }

  private updateMainThreadRender(data: any): void {
    if (!this.cube || !this.renderer || !this.scene || !this.camera) return;

    // 更新立方体旋转
    if (data.rotation) {
      this.cube.rotation.x = data.rotation.x;
      this.cube.rotation.y = data.rotation.y;
    }

    // 渲染场景
    this.renderer.render(this.scene, this.camera);
  }

  cleanup(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'cleanup' });
      this.worker.terminate();
      this.worker = null;
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.canvas = null;
    this.scene = null;
    this.camera = null;
    this.cube = null;
  }

  get supported(): boolean {
    return this.isSupported;
  }
}
