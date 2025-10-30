import type { InitData, MeshCreateCommand } from '../../workers/renderWorker';
import * as THREE from 'three';

export class WorkerRendererService {
  private worker: Worker | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private meshes: Map<string, THREE.Mesh> = new Map(); // 存储所有Mesh
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

      // 在主线程创建Three.js场景和渲染器（只创建基础设施，Mesh等Worker指令创建）
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
        case 'createMesh':
          this.createMeshFromCommand(data as MeshCreateCommand);
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

    // 注意：Mesh由Worker发送创建指令，主线程执行创建
    // 这里只初始化场景和渲染器，不创建Mesh
    console.log('Main: Three.js scene and renderer initialized (waiting for Worker mesh commands)');
  }

  // 根据Worker的指令创建Mesh（主线程执行）
  private createMeshFromCommand(command: MeshCreateCommand): void {
    if (!this.scene) {
      console.error('Scene not initialized, cannot create mesh');
      return;
    }

    console.log('Main: Creating mesh from Worker command:', command.id);

    // 根据指令创建Geometry
    let geometry: THREE.BufferGeometry;
    switch (command.geometry.type) {
      case 'box':
        const { width = 1, height = 1, depth = 1 } = command.geometry.params;
        geometry = new THREE.BoxGeometry(width, height, depth);
        break;
      case 'sphere':
        const { radius = 1, widthSegments = 32, heightSegments = 32 } = command.geometry.params;
        geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
        break;
      case 'plane':
        const { width: w = 1, height: h = 1 } = command.geometry.params;
        geometry = new THREE.PlaneGeometry(w, h);
        break;
      default:
        console.error('Unknown geometry type:', command.geometry.type);
        return;
    }

    // 根据指令创建Material
    let material: THREE.Material;
    switch (command.material.type) {
      case 'basic':
        material = new THREE.MeshBasicMaterial({ 
          color: command.material.color || 0xffffff,
          ...command.material.params,
        });
        break;
      case 'standard':
        material = new THREE.MeshStandardMaterial({ 
          color: command.material.color || 0xffffff,
          ...command.material.params,
        });
        break;
      case 'lambert':
        material = new THREE.MeshLambertMaterial({ 
          color: command.material.color || 0xffffff,
          ...command.material.params,
        });
        break;
      default:
        console.error('Unknown material type:', command.material.type);
        return;
    }

    // 创建Mesh
    const mesh = new THREE.Mesh(geometry, material);

    // 应用初始变换
    if (command.initialTransform) {
      if (command.initialTransform.position) {
        mesh.position.set(
          command.initialTransform.position.x,
          command.initialTransform.position.y,
          command.initialTransform.position.z
        );
      }
      if (command.initialTransform.rotation) {
        mesh.rotation.set(
          command.initialTransform.rotation.x,
          command.initialTransform.rotation.y,
          command.initialTransform.rotation.z
        );
      }
      if (command.initialTransform.scale) {
        mesh.scale.set(
          command.initialTransform.scale.x,
          command.initialTransform.scale.y,
          command.initialTransform.scale.z
        );
      }
    }

    // 存储Mesh（使用ID作为key）
    this.meshes.set(command.id, mesh);
    this.scene.add(mesh);

    console.log('Main: Mesh created and added to scene:', command.id);
    
    // Mesh创建后立即渲染一次，确保初始状态显示
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private updateMainThreadRender(data: any): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    // 根据Worker传来的数据更新所有Mesh的状态
    // Worker在子线程中计算状态，主线程只负责更新和渲染
    if (data.meshId) {
      // 如果指定了meshId，只更新特定的Mesh
      const mesh = this.meshes.get(data.meshId);
      if (mesh) {
        this.updateMeshTransform(mesh, data);
      }
    } else {
      // 如果没有指定meshId，更新第一个Mesh（兼容旧代码）
      const firstMesh = this.meshes.values().next().value;
      if (firstMesh) {
        this.updateMeshTransform(firstMesh, data);
      }
    }

    // 在主线程渲染场景
    this.renderer.render(this.scene, this.camera);
  }

  private updateMeshTransform(mesh: THREE.Mesh, data: any): void {
    if (data.rotation) {
      mesh.rotation.x = data.rotation.x;
      mesh.rotation.y = data.rotation.y;
      mesh.rotation.z = data.rotation.z || 0;
    }

    if (data.position) {
      mesh.position.x = data.position.x;
      mesh.position.y = data.position.y;
      mesh.position.z = data.position.z;
    }

    if (data.scale) {
      mesh.scale.x = data.scale.x;
      mesh.scale.y = data.scale.y;
      mesh.scale.z = data.scale.z;
    }
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

    // 清理所有Mesh
    this.meshes.forEach(mesh => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => mat.dispose());
      } else {
        mesh.material.dispose();
      }
      if (this.scene) {
        this.scene.remove(mesh);
      }
    });
    this.meshes.clear();

    this.canvas = null;
    this.scene = null;
    this.camera = null;
  }

  get supported(): boolean {
    return this.isSupported;
  }
}
