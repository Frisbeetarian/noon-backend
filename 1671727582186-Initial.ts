import {MigrationInterface, QueryRunner} from "typeorm";

export class Initial1671727582186 implements MigrationInterface {
    name = 'Initial1671727582186'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "conversation_to_profile" ("uuid" SERIAL NOT NULL, "conversationUuid" uuid NOT NULL, "profileUuid" uuid NOT NULL, CONSTRAINT "PK_40bfe1879df156a43ef7d9d0d66" PRIMARY KEY ("uuid"))`);
        await queryRunner.query(`ALTER TABLE "conversation_to_profile" ADD CONSTRAINT "FK_7e624c33aa79facd1cd7dc5afbc" FOREIGN KEY ("conversationUuid") REFERENCES "conversation"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation_to_profile" ADD CONSTRAINT "FK_bf5bd2ea38a32f1201128a3c5fb" FOREIGN KEY ("profileUuid") REFERENCES "profile"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversation_to_profile" DROP CONSTRAINT "FK_bf5bd2ea38a32f1201128a3c5fb"`);
        await queryRunner.query(`ALTER TABLE "conversation_to_profile" DROP CONSTRAINT "FK_7e624c33aa79facd1cd7dc5afbc"`);
        await queryRunner.query(`DROP TABLE "conversation_to_profile"`);
    }

}
