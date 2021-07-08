import React from 'react'
import NextApp from 'next/app'
import { ThemeProvider, CSSReset, ColorModeProvider, Box } from '@chakra-ui/core'

// 最外層是 Box
const Layout = ({ children }) => <Box>{children}</Box>

class App extends NextApp {
  render () {
    const { Component, pageProps } = this.props
    return (
      <ThemeProvider>
        {/* 預設係 dark theme */}
        <ColorModeProvider value='dark'>
          {/* CSS reset */}
          <CSSReset />
          <Layout>
            {/* Page component */}
            <Component {...pageProps} />
          </Layout>
        </ColorModeProvider>
        {/* 改變 scroll bar */}
        <style jsx global>{`
          body::-webkit-scrollbar {
            -webkit-appearance: none;
            width: 14px;
          }
          body::-webkit-scrollbar-thumb {
            border-radius: 10px;
            background-color: rgba(0,0,0,.5);
          }
        `}
        </style>
      </ThemeProvider>
    )
  }
}

export default App
