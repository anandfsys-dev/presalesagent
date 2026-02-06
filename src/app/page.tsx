import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
              Salesforce Revenue Cloud
              <br />
              <span className="text-gray-600">Configuration Automation</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              Automate the configuration of Salesforce Revenue Cloud Advanced environments
              through Excel-based data templates. Eliminate manual setup and deploy
              complete product architectures in minutes.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Get Started
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-black text-black font-medium rounded-lg hover:bg-black hover:text-white transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Multi-Org Connection
              </h3>
              <p className="text-gray-600">
                Connect to multiple Salesforce orgs with secure OAuth 2.0 authentication.
                Manage connections and switch between environments seamlessly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Excel Template Processing
              </h3>
              <p className="text-gray-600">
                Upload Excel templates with Products, Attributes, Catalogs, Price Books,
                and more. Automatic validation ensures data integrity before deployment.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Configurable Pipeline
              </h3>
              <p className="text-gray-600">
                Define deployment order with ID dependencies. Handle complex object
                hierarchies with a flexible, configurable execution framework.
              </p>
            </div>
          </div>
        </section>

        {/* Supported Objects Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-12">
            Supported Configuration Objects
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              'Products',
              'Attributes',
              'Picklists',
              'Categories',
              'Catalogs',
              'Price Books',
              'Price List Items',
              'Selling Models',
              'Product Relationships',
              'Attribute Mappings',
            ].map((item) => (
              <div
                key={item}
                className="bg-white px-4 py-3 rounded-lg border border-gray-200 text-center text-sm font-medium text-gray-700"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Salesforce RCA Configuration Tool v1.0.0
            </p>
            <p className="text-sm text-gray-500">
              Built for Revenue Cloud Advanced
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
