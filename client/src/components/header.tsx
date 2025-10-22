"use client";
import Link from "next/link";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed w-full bg-white/90 backdrop-blur-md shadow-sm z-50 transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 hover:scale-105 transition-transform">
          <Shield className="w-8 h-8 text-indigo-600" />
          <button>
            <Link
              href="/"
              className="text-2xl font-bold font-serif text-gray-800 hover:text-indigo-600 transition-colors"
            >
              ObscuraMask
            </Link>
          </button>
        </div>
        <nav className="hidden md:text-sm  md:flex items-center gap-10 lg:text-lg font-medium font-serif">
          <Link
            href="#features"
            className="relative hover:text-indigo-600 transition-colors after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-indigo-600 after:transition-all hover:after:w-full"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="relative hover:text-indigo-600 transition-colors after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-indigo-600 after:transition-all hover:after:w-full"
          >
            How It Works
          </Link>
          <Link
            href="#pricing"
            className="relative hover:text-indigo-600 transition-colors after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-indigo-600 after:transition-all hover:after:w-full"
          >
            Pricing
          </Link>

          <Link
            href="/file-read"
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-full hover:bg-indigo-700 transition-all hover:shadow-lg hover:scale-105 active:scale-95"
          >
            Get Started
          </Link>
        </nav>
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            {menuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <ul className="flex flex-col gap-2 p-4">
            <li>
              <Link
                href="#features"
                onClick={() => setMenuOpen(false)}
                className="block py-3 px-4 hover:bg-indigo-50 rounded-xl transition-all hover:text-indigo-600 hover:translate-x-1"
              >
                Features
              </Link>
            </li>
            <li>
              <Link
                href="#how-it-works"
                onClick={() => setMenuOpen(false)}
                className="block py-3 px-4 hover:bg-indigo-50 rounded-xl transition-all hover:text-indigo-600 hover:translate-x-1"
              >
                How It Works
              </Link>
            </li>
            <li>
              <Link
                href="#pricing"
                onClick={() => setMenuOpen(false)}
                className="block py-3 px-4 hover:bg-indigo-50 rounded-xl transition-all hover:text-indigo-600 hover:translate-x-1"
              >
                Pricing
              </Link>
            </li>
            <li>
              <Link
                href="/file-read"
                onClick={() => setMenuOpen(false)}
                className="block py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all hover:shadow-lg active:scale-95"
              >
                Get Started
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}