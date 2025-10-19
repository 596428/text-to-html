export default function GridGuide() {
  return (
    <div className="absolute inset-0 w-full h-full grid grid-cols-12 gap-0 pointer-events-none z-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="border-r border-dashed border-gray-300 opacity-30 h-full"
        />
      ))}
    </div>
  );
}
