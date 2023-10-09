import { db } from "../..";
import { Format, Genres, Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";

type ReturnType<T> = T extends Type.ANIME ? Anime[] : Manga[];

export const searchAdvanced = async <T extends Type.ANIME | Type.MANGA>(query: string, type: T, formats: Format[], page: number, perPage: number, genres: Genres[] = [], genresExcluded: Genres[] = [], year = 0, tags: string[] = [], tagsExcluded: string[] = []) => {
    const skip = page > 0 ? perPage * (page - 1) : 0;

    let where = `
        WHERE
        (
            ${type === Type.ANIME ? "anime_fts" : "manga_fts"} MATCH 'title:' || :query || '*' 
            OR 
            ${type === Type.ANIME ? "anime_fts" : "manga_fts"} MATCH 'synonyms:' || :query || '*'
        )
        ${formats?.length > 0 ? `AND "format" IN (${formats.map((f) => `'${f}'`).join(", ")})` : ""}
    `;

    if (genres && genres.length > 0) {
        let genreWhere = "";
        for (let i = 0; i < genres.length; i++) {
            genreWhere += `genres LIKE '%${genres[i]}%'`;
            if (i < genres.length - 1) {
                genreWhere += " AND ";
            }
        }
        where += `AND (${genreWhere})`;
    }

    if (genresExcluded && genresExcluded.length > 0) {
        let genreWhere = "";
        for (let i = 0; i < genresExcluded.length; i++) {
            genreWhere += `genres NOT LIKE '%${genresExcluded[i]}%'`;
            if (i < genresExcluded.length - 1) {
                genreWhere += " AND ";
            }
        }
        where += `AND (${genreWhere})`;
    }

    if (tags && tags.length > 0) {
        let tagsWhere = "";
        for (let i = 0; i < tags.length; i++) {
            tagsWhere += `tags LIKE '%${tags[i]}%'`;
            if (i < tags.length - 1) {
                tagsWhere += " AND ";
            }
        }
        where += `AND (${tagsWhere})`;
    }

    if (tags && tags.length > 0) {
        let tagsWhere = "";
        for (let i = 0; i < tags.length; i++) {
            tagsWhere += `tags NOT LIKE '%${tagsExcluded[i]}%'`;
            if (i < tags.length - 1) {
                tagsWhere += " AND ";
            }
        }
        where += `AND (${tagsWhere})`;
    }

    try {
        const results = await db
            .query<
                Db<Anime> | Db<Manga>,
                {
                    ":query": string;
                    ":perPage": number;
                    ":skip": number;
                }
            >(
                `SELECT *,
                bm25(
                    ${type === Type.ANIME ? "anime_fts" : "manga_fts"},
                    1.0 + 0.1 *
                    (SELECT COUNT(*) FROM ${type === Type.ANIME ? "anime_fts" : "manga_fts"}) /
                    (SELECT COUNT(*) FROM ${type === Type.ANIME ? "anime" : "manga"})
                ) as bm25_rank
            FROM ${type === Type.ANIME ? "anime_fts" : "manga_fts"} ${where}
            ORDER BY bm25_rank DESC, title->>'english' ASC
            LIMIT :perPage OFFSET :skip`,
            )
            .all({
                ":query": query,
                ":perPage": perPage,
                ":skip": skip,
            });
        return results.map((data) => {
            try {
                if (data.type === Type.ANIME) {
                    Object.assign(data, {
                        title: JSON.parse((data as any).title),
                        season: (data as any).season.replace(/"/g, ""),
                        mappings: JSON.parse((data as any).mappings),
                        synonyms: JSON.parse((data as any).synonyms),
                        rating: JSON.parse((data as any).rating),
                        popularity: JSON.parse((data as any).popularity),
                        relations: JSON.parse((data as any).relations),
                        genres: JSON.parse((data as any).genres),
                        tags: JSON.parse((data as any).tags),
                        episodes: JSON.parse((data as any).episodes),
                        artwork: JSON.parse((data as any).artwork),
                        characters: JSON.parse((data as any).characters),
                    });

                    return data;
                } else {
                    Object.assign(data, {
                        title: JSON.parse((data as any).title),
                        mappings: JSON.parse((data as any).mappings),
                        synonyms: JSON.parse((data as any).synonyms),
                        rating: JSON.parse((data as any).rating),
                        popularity: JSON.parse((data as any).popularity),
                        relations: JSON.parse((data as any).relations),
                        genres: JSON.parse((data as any).genres),
                        tags: JSON.parse((data as any).tags),
                        chapters: JSON.parse((data as any).chapters),
                        artwork: JSON.parse((data as any).artwork),
                        characters: JSON.parse((data as any).characters),
                    });

                    return data;
                }
            } catch (e) {
                return undefined;
            }
        });
    } catch (e) {
        console.error(e);
        return [];
    }
};
