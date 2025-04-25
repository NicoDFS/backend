import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <Head>
        <title>KalySwap V3 Backend</title>
        <meta name="description" content="KalySwap V3 Backend API" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div>
              <h1 className="text-2xl font-semibold">KalySwap V3 Backend</h1>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <p>Welcome to the KalySwap V3 Backend API.</p>
                <p>
                  This backend provides a GraphQL API for interacting with KalySwap V3 contracts.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <Link href="/api/graphql" className="text-cyan-600 hover:text-cyan-700">
                      GraphQL Playground
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="pt-6 text-base leading-6 font-bold sm:text-lg sm:leading-7">
                <p>Services:</p>
                <ul className="list-disc space-y-2 pl-5 pt-2 text-gray-700 font-normal">
                  <li>DEX Integration</li>
                  <li>Bridge Integration</li>
                  <li>Launchpad Integration</li>
                  <li>Staking Integration</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
