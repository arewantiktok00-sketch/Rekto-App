#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetBridge, NSObject)

RCT_EXTERN_METHOD(updateCampaigns:(NSArray *)campaigns)
RCT_EXTERN_METHOD(updateBalance:(nonnull NSNumber *)availableBalance pendingBalance:(nonnull NSNumber *)pendingBalance)
RCT_EXTERN_METHOD(downloadAndSaveThumbnail:(NSString *)campaignId thumbnailURL:(NSString *)thumbnailURL callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(requestReview)

@end
