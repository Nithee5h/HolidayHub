import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/** Short count-up from 0 to `value` (instant for reduced motion). */
export default function CountUp({ value, format = (n) => n.toLocaleString('en-IN'), duration = 0.9 }) {
  const reduce = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;
    const controls = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setAnimated(Math.round(v)) });
    return () => controls.stop();
  }, [value, duration, reduce]);

  const shown = reduce ? value : animated;
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="visually-hidden">{format(value)}</span>
    </>
  );
}
