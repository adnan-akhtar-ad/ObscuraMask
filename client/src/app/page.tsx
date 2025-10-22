'use client';

import dynamic from 'next/dynamic';
import Link from "next/link";
import {
  Shield,
  Lock,
  FileText,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";

import Header from "@/components/header"; 
import Footer from "@/components/footer";

function LandingPage() {
  const features = [
    {
      icon: <Lock className="w-12 h-12 mx-auto text-indigo-600 mb-4" />,
      title: "Advanced Encryption",
      desc: "Protect files with AES-256 and RSA hybrid algorithms.",
    },
    {
      icon: <FileText className="w-12 h-12 mx-auto text-indigo-600 mb-4" />,
      title: "Multi-format Support",
      desc: "Obfuscate documents, images, spreadsheets, and more.",
    },
    {
      icon: <Shield className="w-12 h-12 mx-auto text-indigo-600 mb-4" />,
      title: "Custom Masking",
      desc: "Fine-tune which sections and metadata to hide.",
    },
  ];

  const companies = [
    { name: "Company A", logo: "/logos/company-a.svg" },
    { name: "Company B", logo: "/logos/company-b.svg" },
    { name: "Company C", logo: "/logos/company-c.svg" },
    { name: "Company D", logo: "/logos/company-d.svg" },
    { name: "Company E", logo: "/logos/company-e.svg" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white text-gray-900">
      {/* Header */}
      <Header />

      {/* Hero */}
      <section className="container mx-auto px-6 pt-32 pb-24 text-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 pt-16">
          <h1 className="text-3xl md:text-7xl font-extrabold mb-8 leading-tight">
            Secure Your Sensitive Data with{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              ObscuraMask
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Effortlessly obfuscate and encrypt files with military-grade security.
            <span className="block mt-2 text-indigo-600 font-medium">
              Complete control, zero hassle.
            </span>
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              href="/file-read"
              className="group relative inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                Get Started Free
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            <Link
              href="#how-it-works"
              className="group inline-flex items-center bg-white hover:bg-gray-50 text-indigo-600 px-8 py-4 rounded-full text-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg border border-indigo-100"
            >
              See How It Works
              <ChevronRight className="ml-2 w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Key Features
            </span>
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="group bg-gradient-to-b from-white to-indigo-50/50 p-8 rounded-2xl hover:shadow-xl transition-all duration-300 border border-indigo-100 hover:border-indigo-200 text-center"
              >
                <div className="transform group-hover:scale-110 transition-transform duration-300">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>
          <div className="relative border-l-2 border-indigo-200 pl-20">
            {[
              { step: '1', title: 'Upload File', desc: 'Choose file and configure access and mask settings.' },
              { step: '2', title: 'Customize Mask', desc: 'Select sections or patterns to conceal.' },
              { step: '3', title: 'Download Secure', desc: 'Retrieve masked file with secure link.' },
            ].map((item, idx) => (
              <div key={idx} className="relative mb-20 last:mb-0 group">
                <div className="absolute -left-[72px] top-0">
                  <div className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:ring-indigo-100">
                    {item.step}
                  </div>
                </div>
                <div className="transform transition-all duration-300 group-hover:translate-x-2">
                  <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-lg">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Pricing Plans</h2>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Free Plan */}
            <div className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <p className="text-3xl font-extrabold mb-4">
                $0
                <span className="text-base font-medium text-gray-500">/mo</span>
              </p>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-center group">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500 transform transition-transform duration-300 group-hover:scale-110" />
                  Up to 5 files/mo
                </li>
                <li className="flex items-center group">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500 transform transition-transform duration-300 group-hover:scale-110" />
                  Basic encryption
                </li>
                <li className="flex items-center group">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500 transform transition-transform duration-300 group-hover:scale-110" />
                  Community support
                </li>
              </ul>
              <button className="mt-auto bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-full font-semibold transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1">
                Start Free
              </button>
            </div>

            {/* Basic Plan */}
            <div className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <h3 className="text-2xl font-bold mb-2">Basic</h3>
              <p className="text-3xl font-extrabold mb-4">
                $9.99
                <span className="text-base font-medium text-gray-500">/mo</span>
              </p>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-center group">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500 transform transition-transform duration-300 group-hover:scale-110" />
                  Up to 50 files/mo
                </li>
                <li className="flex items-center group">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500 transform transition-transform duration-300 group-hover:scale-110" />
                  Standard encryption
                </li>
                <li className="flex items-center group">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500 transform transition-transform duration-300 group-hover:scale-110" />
                  Email support
                </li>
              </ul>
              <button className="mt-auto bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-full font-semibold transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1">
                Select Plan
              </button>
            </div>

            {/* Pro Plan */}
            <div className="flex-1 bg-indigo-600 text-white rounded-2xl shadow-lg p-8 flex flex-col relative transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="absolute top-0 right-0 bg-white text-indigo-600 py-1 px-3 rounded-tr-2xl rounded-bl-2xl text-xs font-bold animate-pulse">
                Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <p className="text-3xl font-extrabold mb-4">
                $19.99
                <span className="text-base font-medium">/mo</span>
              </p>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-center group">
                  <CheckCircle className="w-5 h-5 mr-2 transform transition-transform duration-300 group-hover:scale-110" />
                  Unlimited file masking
                </li>
                <li className="flex items-center group">
                  <CheckCircle className="w-5 h-5 mr-2 transform transition-transform duration-300 group-hover:scale-110" />
                  Advanced options
                </li>
                <li className="flex items-center group">
                  <CheckCircle className="w-5 h-5 mr-2 transform transition-transform duration-300 group-hover:scale-110" />
                  Priority support
                </li>
              </ul>
              <button className="mt-auto bg-white hover:bg-gray-100 text-indigo-600 py-3 rounded-full font-semibold transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1">
                Select Plan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <p className="text-3xl font-bold text-center mb-12">
            Trusted by leading companies worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {companies.map((company, idx) => (
              <div
                key={idx}
                className="group relative w-32 h-12 grayscale hover:grayscale-0 transition-all duration-300 flex items-center justify-center"
              >
                <Image
                  src={company.logo}
                  alt={company.name}
                  fill
                  className="object-contain hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default dynamic(() => Promise.resolve(LandingPage), {
  ssr: false
});