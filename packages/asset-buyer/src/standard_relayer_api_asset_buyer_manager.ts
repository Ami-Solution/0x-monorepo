import { HttpClient } from '@0xproject/connect';
import { ContractWrappers } from '@0xproject/contract-wrappers';
import { ObjectMap } from '@0xproject/types';
import { Provider } from 'ethereum-types';
import * as _ from 'lodash';

import { AssetBuyer } from './asset_buyer';
import { constants } from './constants';
import { assert } from './utils/assert';
import { assetDataUtils } from './utils/asset_data_utils';

import { OrderProvider, StandardRelayerApiAssetBuyerManagerError } from './types';

export class StandardRelayerAPIAssetBuyerManager {
    // Map of assetData to AssetBuyer for that assetData
    private readonly _assetBuyerMap: ObjectMap<AssetBuyer>;
    /**
     * Returns an array of all assetDatas available at the provided sraApiUrl
     * @param   sraApiUrl               The standard relayer API base HTTP url you would like to source orders from.
     * @param   pairedWithAssetData     Optional filter argument to return assetDatas that only pair with this assetData value.
     *
     * @return  An array of all assetDatas available at the provider sraApiUrl
     */
    public static async getAllAvailableAssetDatasAsync(
        sraApiUrl: string,
        pairedWithAssetData?: string,
    ): Promise<string[]> {
        const client = new HttpClient(sraApiUrl);
        const params = {
            assetDataA: pairedWithAssetData,
            perPage: constants.MAX_PER_PAGE,
        };
        const assetPairsResponse = await client.getAssetPairsAsync(params);
        return _.uniq(_.map(assetPairsResponse.records, pairsItem => pairsItem.assetDataB.assetData));
    }
    /**
     * Instantiates a new StandardRelayerAPIAssetBuyerManager instance with all available assetDatas at the provided sraApiUrl
     * @param   provider                The Provider instance you would like to use for interacting with the Ethereum network.
     * @param   sraApiUrl               The standard relayer API base HTTP url you would like to source orders from.
     * @param   orderProvider            An object that conforms to OrderProvider, see type for definition.
     * @param   networkId               The ethereum network id. Defaults to 1 (mainnet).
     * @param   orderRefreshIntervalMs  The interval in ms that getBuyQuoteAsync should trigger an refresh of orders and order states.
     *                                  Defaults to 10000ms (10s).
     * @return  An promise of an instance of StandardRelayerAPIAssetBuyerManager
     */
    public static async getAssetBuyerManagerWithAllAvailableAssetDatasAsync(
        provider: Provider,
        sraApiUrl: string,
        orderProvider: OrderProvider,
        networkId: number = constants.MAINNET_NETWORK_ID,
        orderRefreshIntervalMs?: number,
    ): Promise<StandardRelayerAPIAssetBuyerManager> {
        const contractWrappers = new ContractWrappers(provider, { networkId });
        const etherTokenAssetData = assetDataUtils.getEtherTokenAssetDataOrThrow(contractWrappers);
        const assetDatas = await StandardRelayerAPIAssetBuyerManager.getAllAvailableAssetDatasAsync(
            sraApiUrl,
            etherTokenAssetData,
        );
        return new StandardRelayerAPIAssetBuyerManager(
            provider,
            assetDatas,
            orderProvider,
            networkId,
            orderRefreshIntervalMs,
        );
    }
    /**
     * Instantiates a new StandardRelayerAPIAssetBuyerManager instance
     * @param   provider                The Provider instance you would like to use for interacting with the Ethereum network.
     * @param   assetDatas              The assetDatas of the desired assets to buy (for more info: https://github.com/0xProject/0x-protocol-specification/blob/master/v2/v2-specification.md).
     * @param   orderProvider            An object that conforms to OrderProvider, see type for definition.
     * @param   networkId               The ethereum network id. Defaults to 1 (mainnet).
     * @param   orderRefreshIntervalMs  The interval in ms that getBuyQuoteAsync should trigger an refresh of orders and order states.
     *                                  Defaults to 10000ms (10s).
     * @return  An instance of StandardRelayerAPIAssetBuyerManager
     */
    constructor(
        provider: Provider,
        assetDatas: string[],
        orderProvider: OrderProvider,
        networkId?: number,
        orderRefreshIntervalMs?: number,
    ) {
        assert.assert(assetDatas.length > 0, `Expected 'assetDatas' to be a non-empty array.`);
        this._assetBuyerMap = _.reduce(
            assetDatas,
            (accAssetBuyerMap: ObjectMap<AssetBuyer>, assetData: string) => {
                accAssetBuyerMap[assetData] = new AssetBuyer(
                    provider,
                    assetData,
                    orderProvider,
                    networkId,
                    orderRefreshIntervalMs,
                );
                return accAssetBuyerMap;
            },
            {},
        );
    }
    /**
     * Get an AssetBuyer for the provided assetData
     * @param   assetData   The desired assetData.
     *
     * @return  An instance of AssetBuyer
     */
    public getAssetBuyerFromAssetData(assetData: string): AssetBuyer {
        const assetBuyer = this._assetBuyerMap[assetData];
        if (_.isUndefined(assetBuyer)) {
            throw new Error(
                `${StandardRelayerApiAssetBuyerManagerError.AssetBuyerNotFound}: For assetData ${assetData}`,
            );
        }
        return assetBuyer;
    }
    /**
     * Get an AssetBuyer for the provided ERC20 tokenAddress
     * @param   tokenAddress    The desired tokenAddress.
     *
     * @return  An instance of AssetBuyer
     */
    public getAssetBuyerFromERC20TokenAddress(tokenAddress: string): AssetBuyer {
        const assetData = assetDataUtils.encodeERC20AssetData(tokenAddress);
        return this.getAssetBuyerFromAssetData(assetData);
    }
    /**
     * Get a list of all the assetDatas that the instance supports
     *
     * @return  An array of assetData strings
     */
    public getAssetDatas(): string[] {
        return _.keys(this._assetBuyerMap);
    }
}
