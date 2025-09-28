import { useEffect, useState, useRef } from 'react';
import { motion, PanInfo, useMotionValue } from 'motion/react';
import React, { JSX } from 'react';
import { 
  Thermometer, 
  Coffee, 
  Fan, 
  Lightbulb, 
  Camera, 
  Car,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export interface DeviceCarouselItem {
  title: string;
  description: string;
  id: string;
  icon: React.ReactNode;
  type: string;
  image?: string;
}

export interface DeviceCarouselProps {
  items?: DeviceCarouselItem[];
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  round?: boolean;
  onDeviceSelect?: (device: DeviceCarouselItem) => void;
  onIndexChange?: (index: number, device: DeviceCarouselItem) => void;
}

const DEFAULT_DEVICES: DeviceCarouselItem[] = [
  {
    title: 'Hall Thermostat',
    description: 'Climate control for hallway',
    id: 'climate.thermostat_hall',
    type: 'climate',
    icon: <Thermometer className="h-[16px] w-[16px] text-white" />,
    image: '/imgs/hall-thermo.jpg'
  },
  {
    title: 'Coffee Machine',
    description: 'Smart coffee brewing system',
    id: 'switch.coffee_machine',
    type: 'appliance',
    icon: <Coffee className="h-[16px] w-[16px] text-white" />,
    image: '/imgs/coffee-machine.webp'
  },
  {
    title: 'Office Fan',
    description: 'Air circulation control',
    id: 'fan.office_fan',
    type: 'fan',
    icon: <Fan className="h-[16px] w-[16px] text-white" />,
    image: '/imgs/office-fan.jpg'
  },
  {
    title: 'Living Room Light',
    description: 'Main living area lighting',
    id: 'light.living_room',
    type: 'light',
    icon: <Lightbulb className="h-[16px] w-[16px] text-white" />,
    image: '/imgs/living-room.webp'
  },
  {
    title: 'Bedroom Light',
    description: 'Bedroom lighting control',
    id: 'light.bedroom',
    type: 'light',
    icon: <Lightbulb className="h-[16px] w-[16px] text-white" />,
    image: '/imgs/bedroom-light.webp'
  },
  {
    title: 'Front Door Camera',
    description: 'Security camera monitoring',
    id: 'camera.front_door',
    type: 'security',
    icon: <Camera className="h-[16px] w-[16px] text-white" />,
    image: '/imgs/front-door-camera.jpeg'
  },
  {
    title: 'Garage Door',
    description: 'Garage access control',
    id: 'cover.garage',
    type: 'security',
    icon: <Car className="h-[16px] w-[16px] text-white" />,
    image: '/imgs/garage-door.webp'
  }
];

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 };

export default function DeviceCarousel({
  items = DEFAULT_DEVICES,
  baseWidth = 300,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  round = false,
  onDeviceSelect,
  onIndexChange
}: DeviceCarouselProps): JSX.Element {
  const containerPadding = 16;
  const itemWidth = baseWidth - containerPadding * 2;
  const trackItemOffset = itemWidth + GAP;

  const carouselItems = loop ? [...items, items[0]] : items;
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  useEffect(() => {
    if (autoplay && (!pauseOnHover || !isHovered)) {
      const timer = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev === items.length - 1 && loop) {
            return prev + 1;
          }
          if (prev === carouselItems.length - 1) {
            return loop ? 0 : prev;
          }
          return prev + 1;
        });
      }, autoplayDelay);
      return () => clearInterval(timer);
    }
  }, [autoplay, autoplayDelay, isHovered, loop, items.length, carouselItems.length, pauseOnHover]);

  const effectiveTransition = isResetting ? { duration: 0 } : SPRING_OPTIONS;

  const handleAnimationComplete = () => {
    if (loop && currentIndex === carouselItems.length - 1) {
      setIsResetting(true);
      x.set(0);
      setCurrentIndex(0);
      setTimeout(() => setIsResetting(false), 50);
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      if (loop && currentIndex === items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(prev => Math.min(prev + 1, carouselItems.length - 1));
      }
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      if (loop && currentIndex === 0) {
        setCurrentIndex(items.length - 1);
      } else {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
      }
    }
  };

  const handleDeviceClick = (device: DeviceCarouselItem) => {
    if (onDeviceSelect) {
      onDeviceSelect(device);
    }
  };

  const goToPrevious = () => {
    if (loop && currentIndex === 0) {
      setCurrentIndex(items.length - 1);
    } else {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const goToNext = () => {
    if (loop && currentIndex === items.length - 1) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(prev => Math.min(prev + 1, items.length - 1));
    }
  };

  // Notify parent when current index changes
  useEffect(() => {
    if (onIndexChange) {
      const currentDevice = items[currentIndex % items.length];
      onIndexChange(currentIndex % items.length, currentDevice);
    }
  }, [currentIndex, items, onIndexChange]);

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * (carouselItems.length - 1),
          right: 0
        }
      };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden p-4 ${
        round ? 'rounded-full border border-white' : 'rounded-[24px] border border-card-border bg-gradient-card'
      }`}
      style={{
        width: `${baseWidth}px`,
        paddingBottom: round ? '16px' : '80px',
        ...(round && { height: `${baseWidth}px` })
      }}
    >
      <motion.div
        className="flex"
        drag="x"
        {...dragProps}
        style={{
          width: itemWidth,
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${currentIndex * trackItemOffset + itemWidth / 2}px 50%`,
          x
        }}
        onDragEnd={handleDragEnd}
        animate={{ x: -(currentIndex * trackItemOffset) }}
        transition={effectiveTransition}
        onAnimationComplete={handleAnimationComplete}
      >
        {carouselItems.map((item, index) => {
          const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
          const outputRange = [90, 0, -90];
          // Calculate rotation without using hooks inside map
          const currentX = x.get();
          const rotateY = currentX <= range[0] ? outputRange[0] : 
                         currentX >= range[2] ? outputRange[2] : 
                         outputRange[1];
          return (
            <motion.div
              key={index}
              className={`relative shrink-0 flex flex-col ${
                round
                  ? 'items-center justify-center text-center bg-[#060010] border-0'
                  : 'items-start justify-between bg-muted/30 border-0 rounded-[12px]'
              } overflow-hidden cursor-grab active:cursor-grabbing`}
              style={{
                width: itemWidth,
                height: round ? itemWidth : '300px',
                rotateY: rotateY,
                ...(round && { borderRadius: '50%' })
              }}
              transition={effectiveTransition}
              onClick={() => handleDeviceClick(item)}
            >
              {/* Image Background */}
              {item.image && (
                <div className="absolute inset-0 z-0">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover rounded-[12px]"
                    style={{
                      maskImage: 'linear-gradient(to right, transparent 0%, black 70%)',
                      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 70%)'
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-[12px]"></div>
                </div>
              )}
              
              {/* Content */}
              <div className={`relative z-10 ${round ? 'p-0 m-0' : 'mb-4 p-5'}`}>
                <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-primary">
                  {item.icon}
                </span>
              </div>
              <div className="relative z-10 p-5">
                <div className="font-black text-lg text-foreground tracking-wide">{item.title}</div>
                <p className="text-sm text-muted-foreground tracking-wide">{item.description}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      <div className={`flex w-full items-center justify-center ${round ? 'absolute z-20 bottom-12 left-1/2 -translate-x-1/2' : 'absolute bottom-6 left-1/2 -translate-x-1/2'}`}>
        <div className="flex items-center gap-4">
          {/* Left Arrow */}
          <button
            onClick={goToPrevious}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 ${
              !loop && currentIndex === 0
                ? 'bg-muted-foreground/20 text-muted-foreground/40 cursor-not-allowed'
                : round
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-primary/20 text-primary hover:bg-primary/30'
            }`}
            disabled={!loop && currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Dots */}
          <div className="flex w-[150px] justify-between px-4">
            {items.map((_, index) => (
              <motion.div
                key={index}
                className={`h-2 w-2 rounded-full cursor-pointer transition-colors duration-150 ${
                  currentIndex % items.length === index
                    ? round
                      ? 'bg-white'
                      : 'bg-primary'
                    : round
                      ? 'bg-[#555]'
                      : 'bg-muted-foreground/40'
                }`}
                animate={{
                  scale: currentIndex % items.length === index ? 1.2 : 1
                }}
                onClick={() => setCurrentIndex(index)}
                transition={{ duration: 0.15 }}
              />
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={goToNext}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 ${
              !loop && currentIndex === items.length - 1
                ? 'bg-muted-foreground/20 text-muted-foreground/40 cursor-not-allowed'
                : round
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-primary/20 text-primary hover:bg-primary/30'
            }`}
            disabled={!loop && currentIndex === items.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
