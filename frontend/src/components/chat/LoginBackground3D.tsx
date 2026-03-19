import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// 动态网格球体组件
function PulseNetwork() {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // 使用标准的 IcosahedronGeometry，细分次数设为 4，这样顶点数足够多但不会卡
  const geometry = useMemo(() => {
    // 缩小半径到 1.5，原本是 3
    const geo = new THREE.IcosahedronGeometry(1.5, 4);
    // 保存初始位置的一份拷贝，用于动画还原
    geo.setAttribute('initialPosition', geo.attributes.position.clone());
    return geo;
  }, []);

  // 动画循环：自转 + 顶点波动 (Pulse effect)
  useFrame(({ clock }) => {
    if (meshRef.current && pointsRef.current) {
      const time = clock.getElapsedTime();
      
      // 整体缓慢自转
      const rotY = time * 0.05;
      const rotX = time * 0.03;
      meshRef.current.rotation.set(rotX, rotY, 0);
      pointsRef.current.rotation.set(rotX, rotY, 0);

      // 获取顶点位置数组
      const positions = geometry.attributes.position;
      const initialPositions = geometry.attributes.initialPosition;

      // 遍历所有顶点，根据其空间位置和时间计算一个偏移量
      // 制造一种像心跳/脉冲的波浪起伏感
      for (let i = 0; i < positions.count; i++) {
        const x = initialPositions.getX(i);
        const y = initialPositions.getY(i);
        const z = initialPositions.getZ(i);

        // 简单的 3D 噪声/波函数
        // 这里用 sin 组合制作复杂的起伏，配合 time 的流逝
        const wave1 = Math.sin(x * 1.5 + time * 2);
        const wave2 = Math.sin(y * 1.5 + time * 1.5);
        const wave3 = Math.sin(z * 1.5 + time * 1.8);
        
        // 缩放系数因子
        const factor = 1 + (wave1 + wave2 + wave3) * 0.05;

        positions.setXYZ(i, x * factor, y * factor, z * factor);
      }

      // 通知 Three.js 顶点已更新，需要重新渲染
      positions.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 渲染线框，表现网络连接感 */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshBasicMaterial 
          color="#2f8f73"
          wireframe 
          transparent 
          opacity={0.15} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 渲染顶点发光点 */}
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial 
          size={0.06} 
          color="#8fd6bd"
          transparent 
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation={true}
        />
      </points>
    </group>
  );
}

// 核心背景组件
export function LoginBackground3D() {
  return (
    <div className="absolute inset-0 z-0 bg-zinc-950 pointer-events-auto">
      {/* 拉远摄影机到 z: 6 */}
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        {/* 环境光 */}
        <ambientLight intensity={0.5} />
        {/* 点光源增加发光层次 */}
        <pointLight position={[10, 10, 10]} intensity={1} color="#10b981" />
        
        {/* 将整体球形偏移到靠右靠上一点，不让它完全被中心卡片挡住 */}
        <group position={[1.5, 0.5, -1]}>
          <PulseNetwork />
        </group>
        
        {/* 远处的星空作为背景点缀 */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        {/* 允许用户拖拽互动 */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={0.5}
        />
      </Canvas>
      {/* 叠加上原本的径向渐变，让边缘暗一些，中心亮一些，完美融入 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_var(--tw-gradient-stops))] from-transparent via-zinc-950/80 to-zinc-950 pointer-events-none" />
    </div>
  );
}
