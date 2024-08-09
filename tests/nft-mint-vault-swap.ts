import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftMintVaultSwap } from "../target/types/nft_mint_vault_swap";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { assert } from "chai";
import { fetchAssetV1, fetchCollection } from "@metaplex-foundation/mpl-core";

describe("nft-mint-vault-swap", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  provider.opts.skipPreflight = true;
  provider.opts.commitment = 'confirmed';
  anchor.setProvider(provider);

  const program = anchor.workspace.NftMintVaultSwap as Program<NftMintVaultSwap>;

  const FEE = new anchor.BN(1_00_000_000);
  const NFT_PRICE = new anchor.BN(1_00_000_000);

  const [admin, alice, bob] = [
    anchor.web3.Keypair.generate(),
    anchor.web3.Keypair.generate(),
    anchor.web3.Keypair.generate(),
  ];

  const umi = createUmi(provider.connection.rpcEndpoint, "confirmed").use(
    mplTokenMetadata()
  );

  const adminUmiKeypair = umi.eddsa.createKeypairFromSecretKey(admin.secretKey);
  umi.use(keypairIdentity(adminUmiKeypair));

  const [protocolConfig] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  )

  const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  );

  const collection = anchor.web3.Keypair.generate();

  const nft = anchor.web3.Keypair.generate();

  const collectionArgs = {
    name: "Manchester United Collection 2024",
    uri: "https://ipfs.io/ipfs/QmQQYq41wkaAu5ekxv3xeDbSKyribYvHP8Pz7kPddYvvwB",
    plugins: [],
  };

  const assetArgs = {
    name: "Manchester United NFT 2024",
    uri: "https://ipfs.io/ipfs/QmQQYq41wkaAu5ekxv3xeDbSKyribYvHP8Pz7kPddYvvwB",
    plugins: [],
  };

  it("Init test successfully", async () => {
    const tx = await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(tx);

    const tx2 = await provider.connection.requestAirdrop(
      alice.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(tx2);

    const tx3 = await provider.connection.requestAirdrop(
      bob.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(tx3);
  });

  it("Should init protocol successfully", async () => {
    const tx = await program.methods
      .initializeProtocolConfig(FEE)
      .accountsPartial({
        signer: admin.publicKey,

      })
      .signers([admin])
      .rpc();
    assert.ok(tx);
    console.log("Protocol initialized successfully at tx: ", tx);
  });

  it("Should update fee successfully", async () => {
    const tx = await program.methods
      .setFee(new anchor.BN(1_000_000_000))
      .accounts({
        signer: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    assert.ok(tx);

    console.log("Fee updated successfully at tx: ", tx);
  });

  it("Should create a collection successfully", async () => {
    const tx = await program.methods
      .createCollection(collectionArgs)
      .accountsPartial({
        payer: alice.publicKey,
        collection: collection.publicKey,
        updateAuthority: alice.publicKey,
      })
      .signers([alice, collection])
      .rpc();

    assert.ok(tx);

    const collectionData = await fetchCollection(
      umi,
      collection.publicKey.toString()
    );

    assert.equal(collectionData.name, collectionArgs.name);
    assert.equal(collectionData.uri, collectionArgs.uri);
    assert.equal(collectionData.numMinted, 0);
    assert.equal(collectionData.updateAuthority, alice.publicKey.toString());

    console.log("Collection created successfully at tx: ", tx);
  });

  it("Should mint a token successfully", async () => {
    const tx = await program.methods
      .mintNft(assetArgs)
      .accountsPartial({
        authority: alice.publicKey,
        asset: nft.publicKey,
        collection: collection.publicKey,
        owner: null,
        updateAuthority: null,
        logWrapper: null,
      })
      .signers([alice, nft])
      .rpc();

    assert.ok(tx);

    const assetData = await fetchAssetV1(
      umi,
      publicKey(nft.publicKey.toString())
    );

    assert.equal(assetData.name, assetArgs.name);
    assert.equal(assetData.uri, assetArgs.uri);
    assert.equal(assetData.updateAuthority.type, "Collection");
    assert.equal(
      assetData.updateAuthority.address,
      collection.publicKey.toString()
    );

    const collectionData = await fetchCollection(
      umi,
      collection.publicKey.toString()
    );
    assert.equal(collectionData.numMinted, 1);

    console.log("Token minted successfully at tx: ", tx);
  });

  it("Should lock a nft successfully", async () => {
    const [assetLocker] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("locker"),
        nft.publicKey.toBuffer(),
        alice.publicKey.toBuffer(),
      ],
      program.programId
    );
    const tx = await program.methods
      .lockNft(NFT_PRICE)
      .accountsPartial({
        signer: alice.publicKey,
        asset: nft.publicKey,
        collection: collection.publicKey,
        assetLocker,
        authority: null,
        logWrapper: null,
      })
      .signers([alice])
      .rpc();

    assert.ok(tx);

    const assetData = await fetchAssetV1(
      umi,
      publicKey(nft.publicKey.toString())
    );

    assert.equal(assetData.owner.toString(), vault.toString());

    const vaultBalance = await provider.connection.getBalance(vault);
    assert.equal(vaultBalance, 1_000_000_000);

    console.log("Token locked successfully at tx: ", tx);
  });

  it.skip("Should unlock a nft successfully", async () => {
    const [assetLocker] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("locker"),
        nft.publicKey.toBuffer(),
        alice.publicKey.toBuffer(),
      ],
      program.programId
    );
    const tx = await program.methods
      .unlockNft()
      .accountsPartial({
        signer: alice.publicKey,
        asset: nft.publicKey,
        collection: collection.publicKey,
        assetLocker,
        authority: null,
        logWrapper: null,
      })
      .signers([alice])
      .rpc();

    assert.ok(tx);

    const assetData = await fetchAssetV1(
      umi,
      publicKey(nft.publicKey.toString())
    );

    assert.equal(assetData.owner.toString(), alice.publicKey.toString());

    console.log("Token unlocked successfully at tx: ", tx);
  });

  it("Should swap a nft successfully", async () => {
    const [assetLocker] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("locker"),
        nft.publicKey.toBuffer(),
        alice.publicKey.toBuffer(),
      ],
      program.programId
    );
    const oldUser1Balance = await provider.connection.getBalance(
      alice.publicKey
    );

    const tx = await program.methods
      .swapNft()
      .accountsPartial({
        signer: bob.publicKey,
        asset: nft.publicKey,
        oldOwner: alice.publicKey,
        collection: collection.publicKey,
        assetLocker,
        authority: null,
        logWrapper: null,
      })
      .signers([bob])
      .rpc();

    assert.ok(tx);

    const assetData = await fetchAssetV1(
      umi,
      publicKey(nft.publicKey.toString())
    );

    assert.equal(assetData.owner.toString(), bob.publicKey.toString());

    const newUser1Balance = await provider.connection.getBalance(
      alice.publicKey
    );

    assert.isAbove(newUser1Balance, oldUser1Balance + NFT_PRICE.toNumber());

    console.log("Token swapped successfully at tx: ", tx);
  });
});
