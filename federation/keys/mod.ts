import {
  ActorKeyPairsDispatcher,
  exportJwk,
  generateCryptoKeyPair,
  importJwk,
} from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import prisma from "prisma";

const logger = getLogger("fedify-example");

const getKeys: ActorKeyPairsDispatcher<unknown> = async (_ctx, identifier) => {
  const user = await prisma.user.findUnique({
    where: { username: identifier },
    include: { keys: true },
  });
  if (user == null) return [];

  const keys = Object.fromEntries(
    user.keys.map((row) => [row.type, row]),
  ) as Record<string, typeof user.keys[0]>;
  const pairs: CryptoKeyPair[] = [];
  // 사용자가 지원하는 두 키 형식 (RSASSA-PKCS1-v1_5 및 Ed25519) 각각에 대해
  // 키 쌍을 보유하고 있는지 확인하고, 없으면 생성 후 데이터베이스에 저장:
  for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
    if (keys[keyType] == null) {
      logger.debug(
        "The user {identifier} does not have an {keyType} key; creating one...",
        { identifier, keyType },
      );
      const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
      await prisma.key.create({
        data: {
          userId: user.id,
          type: keyType,
          privateKey: JSON.stringify(await exportJwk(privateKey)),
          publicKey: JSON.stringify(await exportJwk(publicKey)),
        },
      });
      pairs.push({ privateKey, publicKey });
    } else {
      pairs.push({
        privateKey: await importJwk(
          JSON.parse(keys[keyType].privateKey),
          "private",
        ),
        publicKey: await importJwk(
          JSON.parse(keys[keyType].publicKey),
          "public",
        ),
      });
    }
  }
  return pairs;
};

export default getKeys;
