import { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  /** 触发元素的 ref，用于计算定位 */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 下拉内容 */
  children: ReactNode;
  /** 下拉与触发元素的间距，默认 6px */
  gap?: number;
  /** 下拉菜单最小宽度，默认与触发元素同宽 */
  minWidth?: number;
}

/**
 * Portal 下拉容器组件
 * 将下拉菜单渲染到 document.body，彻底脱离祖先 overflow 裁剪和层叠上下文限制
 */
export function DropdownPortal({
  triggerRef,
  isOpen,
  onClose,
  children,
  gap = 6,
  minWidth,
}: DropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, minWidth: 0 });

  /**
   * 根据触发元素的位置计算下拉菜单的坐标
   * 使用 fixed 定位，不受任何祖先 overflow 影响
   */
  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    setPosition({
      top: rect.bottom + gap,
      left: rect.left,
      minWidth: minWidth ?? rect.width,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    /** 滚动时重新计算位置（捕获阶段，确保先于业务逻辑执行） */
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, gap, minWidth]);

  /**
   * 点击外部关闭下拉菜单
   * 同时检查触发元素，避免点击触发元素时重复切换
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        dropdownRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
        minWidth: `${position.minWidth}px`,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
