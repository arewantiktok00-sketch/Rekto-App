#import "RNCSliderViewManager.h"
#import "RNCSlider.h"
#import <React/RCTUIManager.h>
#import <React/RCTConvert.h>

@interface RNCSliderViewManager ()
@end

@implementation RNCSliderViewManager

RCT_EXPORT_MODULE(RNCSlider)

- (UIView *)view
{
  RNCSlider *slider = [RNCSlider new];
  [slider addTarget:self action:@selector(sliderValueChanged:) forControlEvents:UIControlEventValueChanged];
  [slider addTarget:self action:@selector(sliderTouchStart:) forControlEvents:UIControlEventTouchDown];
  [slider addTarget:self action:@selector(sliderTouchEnd:) forControlEvents:UIControlEventTouchUpInside | UIControlEventTouchUpOutside | UIControlEventTouchCancel];
  return slider;
}

RCT_EXPORT_VIEW_PROPERTY(value, float);
RCT_EXPORT_VIEW_PROPERTY(minimumValue, float);
RCT_EXPORT_VIEW_PROPERTY(maximumValue, float);
RCT_EXPORT_VIEW_PROPERTY(step, float);
RCT_EXPORT_VIEW_PROPERTY(minimumTrackTintColor, UIColor);
RCT_EXPORT_VIEW_PROPERTY(maximumTrackTintColor, UIColor);
RCT_EXPORT_VIEW_PROPERTY(thumbTintColor, UIColor);
RCT_EXPORT_VIEW_PROPERTY(disabled, BOOL);
RCT_EXPORT_VIEW_PROPERTY(onRNCSliderValueChange, RCTBubblingEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onRNCSliderSlidingStart, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onRNCSliderSlidingComplete, RCTDirectEventBlock);

- (void)sliderValueChanged:(RNCSlider *)sender
{
  if (sender.onRNCSliderValueChange) {
    float value = [sender discreteValue:sender.value];
    sender.onRNCSliderValueChange(@{ @"value": @(value), @"fromUser": @YES });
  }
}

- (void)sliderTouchStart:(RNCSlider *)sender
{
  sender.isSliding = YES;
  if (sender.onRNCSliderSlidingStart) {
    sender.onRNCSliderSlidingStart(@{ @"value": @(sender.value) });
  }
}

- (void)sliderTouchEnd:(RNCSlider *)sender
{
  float value = [sender discreteValue:sender.value];
  sender.isSliding = NO;
  sender.lastValue = value;
  if (sender.onRNCSliderValueChange) {
    sender.onRNCSliderValueChange(@{ @"value": @(value), @"fromUser": @YES });
  }
  if (sender.onRNCSliderSlidingComplete) {
    sender.onRNCSliderSlidingComplete(@{ @"value": @(value) });
  }
}

@end
