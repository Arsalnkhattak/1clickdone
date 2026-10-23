const sizeClasses = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export default function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <div
      className={`
        animate-spin rounded-full
        border-blue-600 border-t-transparent
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
