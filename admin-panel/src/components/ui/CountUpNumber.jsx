import { useState, useEffect, useRef } from 'react';

export default function CountUpNumber({
 end = 0,
 duration = 600,
 prefix = '',
 suffix = '',
 decimals = 0,
 className = '',
 formatter,
}) {
 const [value, setValue] = useState(0);
 const prevEnd = useRef(0);
 const animationRef = useRef(null);

 useEffect(() => {
 const start = prevEnd.current;
 prevEnd.current = end;

 if (start === end) {
 setValue(end);
 return;
 }

 const startTime = performance.now();
 const diff = end - start;

 const animate = (currentTime) => {
 const elapsed = currentTime - startTime;
 const progress = Math.min(elapsed / duration, 1);

 // Ease out cubic
 const eased = 1 - Math.pow(1 - progress, 3);
 const current = start + diff * eased;

 setValue(current);

 if (progress < 1) {
 animationRef.current = requestAnimationFrame(animate);
 }
 };

 animationRef.current = requestAnimationFrame(animate);

 return () => {
 if (animationRef.current) {
 cancelAnimationFrame(animationRef.current);
 }
 };
 }, [end, duration]);

 const displayValue = formatter
 ? formatter(value)
 : decimals > 0
 ? value.toFixed(decimals)
 : Math.round(value).toLocaleString('en-IN');

 return (
 <span className={className}>
 {prefix}{displayValue}{suffix}
 </span>
 );
}
