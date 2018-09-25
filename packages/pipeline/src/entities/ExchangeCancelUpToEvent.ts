import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ExchangeCancelUpToEvent extends BaseEntity {
    @PrimaryColumn() public logIndex!: number;
    @PrimaryColumn() public blockNumber!: number;

    @Column() public address!: string;
    @Column() public rawData!: string;

    @Column() public makerAddress!: string;
    @Column() public senderAddress!: string;
    @Column() public orderEpoch!: string;
    // TODO(albrow): Include topics?
}