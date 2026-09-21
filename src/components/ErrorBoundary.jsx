import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Lỗi ứng dụng:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 text-center">
          <div className="bg-red-50 text-red-500 p-4 rounded-full mb-4">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Đã xảy ra lỗi ngoài ý muốn</h1>
          <p className="text-gray-600 mb-6 text-sm">Có một sự cố nhỏ trong ứng dụng. Bạn vui lòng tải lại ứng dụng để tiếp tục sử dụng.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium shadow-md hover:bg-teal-700 transition"
          >
            Tải lại ứng dụng
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
