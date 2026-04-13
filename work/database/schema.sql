CREATE DATABASE IF NOT EXISTS xia_ke_ling
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE xia_ke_ling;

CREATE TABLE IF NOT EXISTS test_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  result_id VARCHAR(64) NOT NULL,
  academy_name VARCHAR(64) NOT NULL,
  campus_role VARCHAR(128) NOT NULL,
  sect_name VARCHAR(32) NOT NULL,
  client_id VARCHAR(64) NOT NULL,
  client_timestamp DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_result_id (result_id),
  KEY idx_academy_created (academy_name, created_at),
  KEY idx_client_created (client_id, created_at),
  KEY idx_sect_created (sect_name, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sect_stats (
  academy_name VARCHAR(64) NOT NULL PRIMARY KEY,
  sect_name VARCHAR(32) NOT NULL,
  count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO sect_stats (academy_name, sect_name, count)
VALUES
  ('西子舞蹈学院', '七秀', 0),
  ('青岩医学院', '万花', 0),
  ('苗疆生物研究所', '五毒', 0),
  ('千岛音乐学院', '长歌', 0),
  ('华山道教学院', '纯阳', 0),
  ('首都警察学院', '天策', 0),
  ('西湖财经大学', '藏剑', 0),
  ('西域猫科研究所', '明教', 0),
  ('大漠行星研究所', '衍天', 0),
  ('长白山药科大学', '药宗', 0),
  ('东海海洋大学', '蓬莱', 0),
  ('嵩山武术学院', '少林', 0),
  ('闽南戏剧学院', '无相', 0),
  ('太白山信息学院', '凌雪', 0),
  ('舟山理工大学', '刀宗', 0),
  ('太行兵器研究所', '霸刀', 0),
  ('首都国防大学', '苍云', 0),
  ('岭南农业大学', '万灵', 0),
  ('成都机械学院', '唐门', 0),
  ('君山体育大学', '丐帮', 0),
  ('南诏民族大学', '段氏', 0)
ON DUPLICATE KEY UPDATE
  sect_name = VALUES(sect_name);
