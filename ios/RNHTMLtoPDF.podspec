Pod::Spec.new do |s|
  s.name         = 'RNHTMLtoPDF'
  s.version      = '0.12.0-local'
  s.summary      = 'Legacy RNHTMLtoPDF bridge module'
  s.description  = 'Bridges react-native-html-to-pdf legacy iOS native module for old architecture apps.'
  s.homepage     = 'https://github.com/christopherdro/react-native-html-to-pdf'
  s.license      = { :type => 'MIT' }
  s.authors      = { 'Rekto' => 'support@rekto.net' }
  s.platform     = :ios, '15.1'
  s.source       = { :path => '.' }

  s.source_files = '../node_modules/react-native-html-to-pdf/ios/RNHTMLtoPDF/*.{h,m}'
  s.frameworks   = 'UIKit', 'WebKit'

  s.dependency 'React-Core'
end
